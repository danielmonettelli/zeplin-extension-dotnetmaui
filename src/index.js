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

function xamlStyle(context, textStyle) {
  // Added default lineBreakMode as a best practice for UI consistency
  const ignoreFontFamily = context.getOption('ignoreFontFamily');
  const textColor = textStyle.color && xamlColorLiteral(context, textStyle.color);
  const textAlignmentMode = context.getOption('textAlignmentMode');
  const hasTextAlignment = textAlignmentMode === 'style';
  return {
    key: actualKey(context, textStyle.name),
    fontSize: round(textStyle.fontSize, 2),
    fontAttributes: xamlFontAttributes(textStyle.fontWeight),
    fontFamily:
      !ignoreFontFamily && `${textStyle.fontFamily}#${textStyle.fontWeight}`,
    textColor,
    horizontalTextAlignment:
      hasTextAlignment && capitalize(textStyle.textAlign),
    // Uncomment and set a default LineBreakMode if needed:
    // lineBreakMode: "WordWrap"
  };
}

function xamlLabel(context, textLayer) {
  const { textStyle } = textLayer.textStyles[0];
  const textStyleResource = context.project.findTextStyleEqual(textStyle);
  const label = textStyleResource
    ? { style: actualKey(context, textStyleResource.name) }
    : xamlStyle(context, textStyle);
  const textAlignmentMode = context.getOption('textAlignmentMode');
  const hasTextAlignment = textAlignmentMode === 'style';
  label.text = textLayer.content;
  label.horizontalTextAlignment = hasTextAlignment && capitalize(textStyle.textAlign);
  return label;
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

// Modified textStyles function to auto-generate keys for Label styles
function textStyles(context) {
  const containerType = context.project ? "project" : "styleguide";
  const sortResources = context.getOption("sortResources");
  const duplicateSuffix = context.getOption("duplicateSuffix");
  let processedTextStyles = context[containerType].textStyles;

  if (sortResources) {
    processedTextStyles = sortBy(processedTextStyles, "name");
  }

  if (duplicateSuffix) {
    processedTextStyles = processedTextStyles.filter(
      (textStyle) => !textStyle.name.endsWith(duplicateSuffix)
    );
  }

  // Map each textStyle and assign a region based on its font size
  const styles = processedTextStyles.map((textStyle) => {
    const styleObj = xamlStyle(context, textStyle);
    styleObj.region = getRegionForTextStyle(textStyle);
    return styleObj;
  });

  // Group styles by region
  const groups = {};
  styles.forEach((s) => {
    groups[s.region] = groups[s.region] || [];
    groups[s.region].push(s);
  });

  // Generate output with region comments and auto-generated keys (e.g. txtHeadline2_1)
  let output = "";
  // Removed "Label" from regionOrder
  const regionOrder = ["Headline1", "Headline2", "Headline3", "Headline4", "Headline5", "Headline6", "Subtitle1", "Subtitle2", "Body1", "Body2", "Caption"];
  regionOrder.forEach((region) => {
      output += `<!--#region ${region}-->\n`;
      if (groups[region]) {
        groups[region].forEach((style, index) => {
          style.key = `txt${region}_${index + 1}`;
        });
        // Trim the output so no extra spaces/newlines are added
        output += textStylesTemplate({ styles: groups[region] }).trim() + "\n";
      }
      output += `<!--#endregion-->\n\n`;
  });
  // Trim trailing newlines/spaces so final output has no extra spacing.
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
