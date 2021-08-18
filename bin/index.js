#!/usr/bin/env node
const axios = require("axios");
const inquirer = require("inquirer");
const chalk = require("chalk");
const filesystem = require('fs');

// Gets a list of the themes available on the tenant
const getThemes = (tenant, token) => {
  const url = 'https://'+ tenant +'/api/v1/themes'
  try {
    return axios.get(
      url, 
      { 
        headers: { 
          Accept: "application/json",
          'Authorization': `Bearer ${token}`
        } 
      } 
    );
  } catch (error) {
    console.error(chalk.red('Error, please check your tenant domain and try again'));
  }
}

// Gets the theme.json file
const getThemeJson = (tenant, token, themeId) => {
  const url = 'https://'+ tenant +'/api/v1/themes/'+ themeId +'/file/theme.json';
  try {
    return axios.get(
      url, 
      { 
        headers: { 
          Accept: "application/json",
          'Authorization': `Bearer ${token}`
        } 
    });
  } catch (error) {
    console.error(chalk.red('Error, please check your API Key and try again'));
  }
}

// Helper function to resolve variables within a json object
function resolveVariables(objTree, variables) {
  Object.keys(objTree).forEach((key) => {
    if (typeof objTree[key] === 'object' && objTree[key] !== null) {
      resolveVariables(objTree[key], variables);
    } else if (typeof objTree[key] === 'string' && objTree[key].charAt(0) === '@') {
      // Resolve variables
      objTree[key] = variables[objTree[key]]; // eslint-disable-line no-param-reassign
    }
  });
}

(async () => {
  // 1. Prompt user for tenant
  const ansTenant = await inquirer.prompt([
    {
      type: 'input',
      name: 'tenant',
      message: 'Enter your tenant domain ',
    },
  ]);

  // 2. Prompt user for API key
  const ansToken = await inquirer.prompt([
    {
      type: 'input',
      name: 'token',
      message: 'Enter API Key: ',
    },
  ]);

  try {
    const response = await getThemes(ansTenant.tenant, ansToken.token);
    // 3. Prompt user to choose a theme from the list of choices
    const ansThemeChoice = await inquirer.prompt([
      {
        type: "list",
        name: "themeId",
        message: "Select a theme: ",
        choices: response.data.data.map(r => r.name)
      },
    ]);

    const selectedTheme = response.data.data.find(r => r.name === ansThemeChoice.themeId);

    try {
      const themeJson = await getThemeJson(ansTenant.tenant, ansToken.token, selectedTheme.id);

      if(themeJson.data) {
        
        let dataResolve = Object.assign({}, themeJson.data);
        resolveVariables(dataResolve, dataResolve._variables);

        // Map to MUI/nebula compatible theme
        const mappedJson = {};
        
        // type
        mappedJson.type = 'custom';
        // base
        mappedJson.base = {
          fontSize: dataResolve.fontSize,
          fontFamily: "'Source Sans Pro', 'Arial', 'sans-serif'",
          backgroundColor: dataResolve.backgroundColor,
          dataColors: dataResolve.dataColors,
          scales: dataResolve.scales,
          palettes: dataResolve.palettes
        };
        // custom
        mappedJson.custom = {
          _variables: themeJson.data._variables,
          type: 'custom',
          color: themeJson.data.color
        };
        // theme
        mappedJson.theme = {
          type: 'custom',
          palette: {
            primary: {
            main: themeJson.data.dataColors.primaryColor,
            contrastText: themeJson.data.dataColors.primaryColor
            },
            secondary: {
              light: themeJson.data.dataColors.othersColor,
              main: themeJson.data.dataColors.othersColor,
              dark: themeJson.data.dataColors.othersColor,
            },
            text: {
              primary: themeJson.data.dataColors.primaryColor,
              secondary: 'rgba(0, 0, 0, 0.55)',
              disabled: 'rgba(0, 0, 0, 0.3)',
            },
            action: {
              active: themeJson.data.dataColors.primaryColor, // color for actionable things like icon buttons
              hover: 'rgba(0, 0, 0, 0.03)', // color for hoverable things like list items
              hoverOpacity: 0.08, // used to fade primary/secondary colors
              selected: 'rgba(0, 0, 0, 0.05)', // focused things like list items
              disabled: 'rgba(0, 0, 0, 0.3)', // usually text
              disabledBackground: 'rgba(0, 0, 0, 0.12)',
            },
            background: {
              paper: dataResolve.backgroundColor,
              default: dataResolve.backgroundColor,
              lightest: dataResolve.backgroundColor,
              lighter: dataResolve.backgroundColor,
              darker: dataResolve.backgroundColor,
              darkest: dataResolve.backgroundColor,
            },
            custom: {
              focusBorder: themeJson.data.dataColors.othersColor,
              focusOutline: 'rgba(70, 157, 205, 0.3)',
              inputBackground: 'rgba(255, 255, 255, 1)',
            },
            selected: {
              main: '#009845',
              alternative: '#E4E4E4',
              excluded: '#BEBEBE',
              mainContrastText: '#ffffff',
              alternativeContrastText: '#404040',
              excludedContrastText: '#404040',
            },
            btn: {
              normal: 'rgba(255, 255, 255, 0.6)',
              hover: 'rgba(0, 0, 0, 0.03)',
              active: 'rgba(0, 0, 0, 0.1)',
              disabled: 'rgba(255, 255, 255, 0.6)',
              border: 'rgba(0, 0, 0, 0.15)',
              borderHover: 'rgba(0, 0, 0, 0.15)',
            },
          }
        };

        // Write to theme.json
        try {
          filesystem.writeFile('theme.json', JSON.stringify(mappedJson), (err) => {
            if(err) throw err;
            console.log(chalk.green('The theme file has been successfully saved!'));
          })
        } catch(e) {
          console.log(chalk.red('Error saving your file, please try again'));
        }
      }

    } catch(e) {
      console.log(chalk.red('Error, please check your API Key and try again'));
    }

  } catch(e) {
    console.log(chalk.red('Error, please check your tenant domain and try again'));
  }

})();

