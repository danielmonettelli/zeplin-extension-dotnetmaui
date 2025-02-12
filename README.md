# Zeplin Extension for .NET MAUI

## Overview

This extension extracts design assets from Zeplin and converts them into XAML for .NET MAUI projects. It currently enables developers to:

- Export color resources into a Colors.xaml file.
- Generate deterministic text styles (Labels.xaml) using region-based keys derived from font properties.
- Convert selected UI layers into appropriate XAML elements:
  - Text layers become Labels.
  - Image layers become Images.
  - Other layers are wrapped in Borders or, if large enough, in full ContentPages.

Integrating this extension into Zeplin helps .NET MAUI developers seamlessly implement accurate design exports in their UI/UX workflows.

## Main Features

- Deterministic text style generation based on regions and typography attributes.
- Optimized caching for colors and label styles to reduce processing time.
- Full support for images, borders, grids, and complete UI ContentPages.
- Customization using context options such as sorting resources, consolidating duplicates, and ignoring FontFamily.

## Usage

- Configure the extension options via the provided context.
- Use `exportColors` to generate the Colors.xaml file.
- Use `exportTextStyles` to generate the Labels.xaml file.
- Employ `layer` to generate the XAML for the selected component.
- For full UI cases, the extension wraps components in an optimized ContentPage.

## Options

### Sort Styleguide Resources

Toggle automatic alphabetical sorting of styleguide resources.

### Consolidate Duplicates

Define a suffix (e.g., `_duplicate`) to consolidate duplicate styles or colors.

### Ignore FontFamily

Toggle whether FontFamily should be generated or omitted based on project needs.

## Development

This extension is focused on enhancing productivity and consistency in .NET MAUI projects by converting Zeplin designs into XAML. It is developed using [zem](https://github.com/zeplin/zem), a command line tool that facilitates quick extension creation and testing.

For more details on zem, see the [documentation](https://github.com/zeplin/zem).

## License

This project is licensed under the Apache License, Version 2.0 - see the [LICENSE](LICENSE) file for details.
