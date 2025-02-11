import round from 'lodash/round';
import capitalize from 'lodash/capitalize';
import sortBy from 'lodash/sortBy';
import indentString from 'indent-string';
import colorsTemplate from './templates/colors.mustache';
import textStylesTemplate from './templates/textStyles.mustache';
import labelTemplate from './templates/label.mustache';
import imageTemplate from './templates/image.mustache';
import borderTemplate from './templates/border.mustache';
import stackLayoutTemplate from './templates/stacklayout.mustache';
import cssTemplate from './templates/css.mustache';
import resourceDictionaryTemplate from './templates/resourceDictionary.mustache';

// Added caching object to improve performance if enabled
const cache = {};

// Add a registry to track auto-generated styles per region.
const autoStyleRegistry = {};

// Add new registry specifically for labels
const labelStyleRegistry = {};

// Add registry for storing generated label styles
const labelStylesRegistry = {
    styles: new Map(),
    nextIndex: {},
    generatedStyles: {},
    initialized: false  // Nueva bandera para controlar la inicialización
};

// Remove autoLabelRegistry and getAutoGeneratedLabelKey.

// Helper to generate a unique style key based on region and textStyle properties.
function getAutoGeneratedStyleKey(context, textStyle) {
    const region = getRegionForTextStyle(textStyle);
    const ignoreFontFamily = context.getOption('ignoreFontFamily');
    const fontFamily = !ignoreFontFamily && textStyle.fontFamily ? `${textStyle.fontFamily}#${textStyle.fontWeight}` : '';
    const fontSize = round(textStyle.fontSize, 2);
    const textColor = textStyle.color ? xamlColorLiteral(context, textStyle.color) : '';
    const textAlign = textStyle.textAlign || '';
    const hash = `${region}|${fontFamily}|${fontSize}|${textColor}|${textAlign}`;
    if (!autoStyleRegistry[region]) {
        autoStyleRegistry[region] = { nextIndex: 0, map: {} };
    }
    if (autoStyleRegistry[region].map[hash]) {
        return autoStyleRegistry[region].map[hash];
    }
    autoStyleRegistry[region].nextIndex += 1;
    const key = `txt${region}_${autoStyleRegistry[region].nextIndex}`;
    autoStyleRegistry[region].map[hash] = key;
    return key;
}

// New: helper to reset the autoStyleRegistry.
function resetAutoStyleRegistry() {
  for (const region in autoStyleRegistry) {
    autoStyleRegistry[region].nextIndex = 0;
    autoStyleRegistry[region].map = {};
  }
}

// Helper to reset label registry
function resetLabelRegistry() {
    for (const region in labelStyleRegistry) {
        delete labelStyleRegistry[region];
    }
}

// New helper to generate sequential keys for labels, similar to textStyles but independent
function generateLabelStyleKey(context, textStyle) {
    const region = getRegionForTextStyle(textStyle);
    
    if (!labelStyleRegistry[region]) {
        labelStyleRegistry[region] = { 
            nextIndex: 0,
            styles: new Map()
        };
    }

    // Create unique signature for this style
    const styleSignature = JSON.stringify({
        fontFamily: textStyle.fontFamily,
        fontWeight: textStyle.fontWeight,
        fontSize: round(textStyle.fontSize, 2),
        color: textStyle.color ? xamlColorHex(textStyle.color) : '',
        textAlign: textStyle.textAlign || ''
    });

    const regionRegistry = labelStyleRegistry[region];
    
    // If we haven't seen this style before, assign next number
    if (!regionRegistry.styles.has(styleSignature)) {
        regionRegistry.nextIndex++;
        regionRegistry.styles.set(styleSignature, regionRegistry.nextIndex);
    }

    return `txt${region}_${regionRegistry.styles.get(styleSignature)}`;
}

// Function to generate and store label styles similar to textStyles
function generateLabelStyles(context, textLayer) {
    // Solo inicializar una vez al principio
    if (!labelStylesRegistry.initialized) {
        labelStylesRegistry.styles.clear();
        labelStylesRegistry.nextIndex = {};
        labelStylesRegistry.generatedStyles = {};
        labelStylesRegistry.initialized = true;
    }

    const { textStyle } = textLayer.textStyles[0];
    const region = getRegionForTextStyle(textStyle);
    
    // Initialize region if needed
    if (!labelStylesRegistry.generatedStyles[region]) {
        labelStylesRegistry.generatedStyles[region] = [];
        labelStylesRegistry.nextIndex[region] = 1;
    }

    // Create style object
    const styleObj = {
        fontSize: round(textStyle.fontSize, 2),
        fontAttributes: xamlFontAttributes(textStyle.fontWeight),
        fontFamily: textStyle.fontFamily ? `${textStyle.fontFamily}#${textStyle.fontWeight}` : '',
        textColor: textStyle.color ? xamlColorLiteral(context, textStyle.color) : '',
        horizontalTextAlignment: textStyle.textAlign
    };

    // Create hash to identify unique styles
    const styleHash = JSON.stringify(styleObj);

    // If style doesn't exist, add it
    if (!labelStylesRegistry.styles.has(styleHash)) {
        const key = `txt${region}_${labelStylesRegistry.nextIndex[region]}`;
        labelStylesRegistry.nextIndex[region]++;
        styleObj.key = key;
        labelStylesRegistry.styles.set(styleHash, key);
        labelStylesRegistry.generatedStyles[region].push(styleObj);
    }

    return labelStylesRegistry.styles.get(styleHash);
}

// function debug(object) {
//   // eslint-disable-line no-unused-vars
//   return {
//     code: JSON.stringify(object),
//     language: 'json',
//   };
// }

function actualKey(context, key) {
  if (key) {
    const duplicateSuffix = context.getOption('duplicateSuffix');
    return key.replace(duplicateSuffix, '').replace(/\s/g, '');
  }
  return undefined;
}

function xamlColorHex(color) {
  const hex = color.toHex();
  if (color.a === 1) {
    // Si alfa es 1 (completamente opaco), omitirlo
    return `#${hex.r}${hex.g}${hex.b}`.toUpperCase();
  } else {
    const a = Math.round(color.a * 255).toString(16).padStart(2, '0');
    return `#${a}${hex.r}${hex.g}${hex.b}`.toUpperCase();
  }
}

function xamlColorLiteral(context, color) {
  const colorResource = context.project.findColorEqual(color);

  return colorResource !== undefined
    ? `{StaticResource ${actualKey(context, colorResource.name)}}`
    : xamlColorHex(color);
}

function xamlColor(context, color) {
  return {
    key: actualKey(context, color.name),
    color: xamlColorHex(color),
  };
}

function xamlFontAttributes(fontWeight) {
  switch (fontWeight) {
    case 700:
      return 'Bold';
    case 800:
      return 'Bold';
    case 900:
      return 'Bold';
    case 950:
      return 'Bold';
    default:
      return 'None';
  }
}

function toImageName(layerName) {
  const removeUnderLine = layerName.replace('_', ' ');
  const words = removeUnderLine.split(' ');
  let pascalCase = words[0].toLowerCase();
  for (let i = 1; i < words.length; i += 1) {
    pascalCase = pascalCase + words[i].charAt(0).toUpperCase() + words[i].substr(1).toLowerCase();
  }
  const friendlyName = pascalCase.replace(/\s/g, '');
  return friendlyName;
}

// Modify xamlStyle to NOT assign a key from textStyle.name.
function xamlStyle(context, textStyle) {
  const ignoreFontFamily = context.getOption('ignoreFontFamily');
  const textColor = textStyle.color && xamlColorLiteral(context, textStyle.color);
  const textAlignmentMode = context.getOption('textAlignmentMode');
  const hasTextAlignment = textAlignmentMode === 'style';
  return {
    // key is omitted here to force later assignment
    fontSize: round(textStyle.fontSize, 2),
    fontAttributes: xamlFontAttributes(textStyle.fontWeight),
    fontFamily: !ignoreFontFamily && `${textStyle.fontFamily}#${textStyle.fontWeight}`,
    textColor,
    horizontalTextAlignment: hasTextAlignment && capitalize(textStyle.textAlign),
    // lineBreakMode: "WordWrap"
  };
}

// Updated xamlLabel to use the new style generation system
function xamlLabel(context, textLayer) {
    const key = generateLabelStyles(context, textLayer);
    return {
        text: textLayer.content,
        style: key
    };
}

function xamlImage(context, imageLayer) {
  const image = {
    widthRequest: imageLayer.rect.width,
    heightRequest: imageLayer.rect.height,
    source: toImageName(imageLayer.name),
  };
  return image;
}

function xamlBorder(context, borderLayer) {
  const border = {
    widthRequest: borderLayer.rect.width,
    heightRequest: borderLayer.rect.height,
    cornerRadius: borderLayer.borderRadius || 0,
  };
  const hasBackgroundColor = !(
    borderLayer.fills === undefined || borderLayer.fills.length === 0
  );
  if (hasBackgroundColor) {
    // eslint-disable-next-line max-len
    const backgroundColor = borderLayer.fills[0].color && xamlColorLiteral(context, borderLayer.fills[0].color);
    border.backgroundColor = backgroundColor;
  }
  const hasBorder = !(
    borderLayer.borders === undefined || borderLayer.borders.length === 0
  );
  if (hasBorder) {
    // eslint-disable-next-line max-len
    const outlineColor = borderLayer.borders[0].fill.color && xamlColorLiteral(context, borderLayer.borders[0].fill.color);
    border.outlineColor = outlineColor;
  }
  return border;
}

function xamlStackLayout(context, stackLayer) {
  const hasBackgroundColor = !(
    stackLayer.fills === undefined || stackLayer.fills.length === 0
  );
  const stackLayout = {
    widthRequest: stackLayer.rect.width,
    heightRequest: stackLayer.rect.height,
  };

  if (hasBackgroundColor) {
    const backgroundColor = stackLayer.fills[0].color
      && xamlColorLiteral(context, stackLayer.fills[0].color);
    stackLayout.backgroundColor = backgroundColor;
  }

  return stackLayout;
}

function cssStyle(context, cssLayer) {
  const hasBackgroundColor = !(
    cssLayer.fills === undefined || cssLayer.fills.length === 0
  );
  const hasBorder = !(
    cssLayer.borders === undefined || cssLayer.borders.length === 0
  );
  const hasFonts = !(
    cssLayer.textStyles === undefined || cssLayer.textStyles.length === 0
  );
  const cssItem = {
    className: toImageName(cssLayer.name),
    width: cssLayer.rect.width,
    height: cssLayer.rect.height,
    opacity: cssLayer.opacity,
  };

  if (hasBackgroundColor) {
    const backgroundColor = xamlColorHex(cssLayer.fills[0].color);
    cssItem.backgroundColor = backgroundColor;
  }

  if (hasBorder) {
    const borderColor = xamlColorHex(cssLayer.borders[0].fill.color);
    cssItem.borderColor = borderColor;
    cssItem.borderWidth = cssLayer.borders[0].thickness;
  }
  if (hasFonts) {
    cssItem.fontFamily = cssLayer.textStyles[0].textStyle.fontFamily;
    cssItem.fontSize = cssLayer.textStyles[0].textStyle.fontSize;
    cssItem.fontStyle = cssLayer.textStyles[0].textStyle.fontStyle;
    cssItem.textAlign = cssLayer.textStyles[0].textStyle.textAlign;
    cssItem.color = xamlColorHex(cssLayer.textStyles[0].textStyle.color);
  }

  return cssItem;
}

function xamlCode(code) {
  return {
    code,
    language: 'xml',
  };
}

function xamlFile(code, filename) {
  return {
    code,
    language: 'xml',
    filename,
  };
}

function colors(context) {
  if (!context.project) {
    return null;
  }

  const sortResources = context.getOption('sortResources');
  const duplicateSuffix = context.getOption('duplicateSuffix');
  let processedColors = context.project.colors;

  if (sortResources) {
    processedColors = sortBy(processedColors, 'name');
  }

  if (duplicateSuffix) {
    processedColors = processedColors.filter(
      (color) => !color.name.endsWith(duplicateSuffix),
    );
  }

  const code = colorsTemplate({
    colors: processedColors.map((color) => xamlColor(context, color)),
  });

  return xamlCode(code);
}

// Updated helper: assign Material Design regions based on textStyle.fontSize
function getRegionForTextStyle(textStyle) {
  const size = textStyle.fontSize;
  if (size >= 50) return "Headline1";
  if (size >= 40) return "Headline2";
  if (size >= 32) return "Headline3";
  if (size >= 28) return "Headline4";
  if (size >= 24) return "Headline5";
  if (size >= 20) return "Headline6";
  // Use exact values for standardized text styles:
  if (size === 16) return "Subtitle1";
  if (size === 14) return "Subtitle2";
  if (size === 12) return "Body2";
  if (size === 11) return "Body1";
  return "Caption";
}

// In textStyles, replace the key assignment to compute keys deterministically.
function textStyles(context) {
  resetAutoStyleRegistry(); // reset order before processing styles
  const containerType = context.project ? "project" : "styleguide";
  // Force sort processed text styles by name for consistent ordering.
  let processedTextStyles = sortBy(context[containerType].textStyles, "name");
  // Optionally filter out duplicate resources.
  const duplicateSuffix = context.getOption("duplicateSuffix");
  if (duplicateSuffix) {
    processedTextStyles = processedTextStyles.filter(
      (textStyle) => !textStyle.name.endsWith(duplicateSuffix)
    );
  }
  
  const styles = processedTextStyles.map((textStyle) => {
    const styleObj = xamlStyle(context, textStyle);
    styleObj.region = getRegionForTextStyle(textStyle);
    // Generate and register the key in the sorted order.
    styleObj.key = getAutoGeneratedStyleKey(context, textStyle);
    return styleObj;
  });

  // Group styles by region.
  const groups = {};
  styles.forEach((s) => {
    groups[s.region] = groups[s.region] || [];
    groups[s.region].push(s);
  });

  let output = "";
  const regionOrder = ["Headline1", "Headline2", "Headline3", "Headline4", "Headline5", "Headline6", "Subtitle1", "Subtitle2", "Body1", "Body2", "Caption"];
  regionOrder.forEach((region) => {
    output += `<!--#region ${region}-->\n`;
    if (groups[region]) {
      // Ensure group is sorted by numeric suffix to maintain sequential order.
      groups[region].sort((a, b) => {
        const numA = parseInt(a.key.split('_')[1], 10);
        const numB = parseInt(b.key.split('_')[1], 10);
        return numA - numB;
      });
      output += textStylesTemplate({ styles: groups[region] }).trim() + "\n";
    }
    output += `<!--#endregion-->\n\n`;
  });
  output = output.trim();
  return xamlCode(output);
}

function exportColors(context) {
  if (context.getOption('enableCache') && cache.colors) {
    return cache.colors;
  }
  const resources = indentString(colors(context).code, 4);
  const resourceDictionary = resourceDictionaryTemplate({ resources });
  const result = xamlFile(resourceDictionary, 'Colors.xaml');
  if (context.getOption('enableCache')) {
    cache.colors = result;
  }
  return result;
}

function exportTextStyles(context) {
  if (context.getOption('enableCache') && cache.labels) {
    return cache.labels;
  }
  const resources = indentString(textStyles(context).code, 4);
  const resourceDictionary = resourceDictionaryTemplate({ resources });
  const result = xamlFile(resourceDictionary, 'Labels.xaml');
  if (context.getOption('enableCache')) {
    cache.labels = result;
  }
  return result;
}

function layer(context, selectedLayer) {
  if (selectedLayer.type === 'text') {
    const label = xamlLabel(context, selectedLayer);
    const cssLabelItem = cssStyle(context, selectedLayer);
    const code = labelTemplate(label) + cssTemplate(cssLabelItem);

    return xamlCode(`${code}`);
  } if (selectedLayer.exportable) {
    const image = xamlImage(context, selectedLayer);
    const code = imageTemplate(image);
    return xamlCode(`${code}`);
  }

  const border = xamlBorder(context, selectedLayer);
  const stackLayout = xamlStackLayout(context, selectedLayer);
  const cssItem = cssStyle(context, selectedLayer);
  const code = borderTemplate(border) + stackLayoutTemplate(stackLayout) + cssTemplate(cssItem);

  return xamlCode(`${code}`);
}

const extension = {
  colors,
  textStyles,
  exportColors,
  exportTextStyles,
  layer,
};

export default extension;
