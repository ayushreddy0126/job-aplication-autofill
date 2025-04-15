# JobFill - Job Application Autofiller

JobFill is a Chrome extension that automatically fills out job applications using information from your resume. Save time during your job search by eliminating repetitive data entry!

## Features

- **Resume Parsing**: Upload your resume (PDF, DOCX, or TXT) and extract structured information
- **Smart Form Detection**: Automatically identifies form fields on job application websites
- **Intelligent Autofill**: Maps your resume data to the appropriate form fields
- **Site-Specific Support**: Enhanced support for major job application platforms:
  - Workday
  - Lever
  - Greenhouse
  - And more!
- **Common Question Handling**: Automatically handles common job application questions
- **Data Privacy**: Your resume data stays in your browser - nothing is sent to external servers

## Installation

### From Chrome Web Store
*Coming soon*

### Local Development Installation
1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in the top-right corner)
4. Click "Load unpacked" and select the folder containing the extension
5. The JobFill icon should now appear in your browser toolbar

## How to Use

1. **Upload Your Resume**:
   - Click the JobFill icon in your Chrome toolbar
   - Click "Choose file" to upload your resume (PDF, DOCX, or TXT)
   - Click "Parse Resume" to extract your information

2. **Review and Edit**:
   - Review the extracted information across all tabs (Personal, Education, Experience, Skills)
   - Make any necessary corrections
   - Click "Save Data" to store your information

3. **Autofill Job Applications**:
   - Navigate to a job application page
   - JobFill will automatically detect the form fields
   - Click the JobFill icon and then "Fill Current Page" to autofill the form
   - Review and submit your application!

## Settings

- **Enable Autofill**: Toggle automatic form filling on/off
- **Highlight Uncertain Fields**: When enabled, fields that may not be perfect matches will be highlighted for your review

## Supported Sites

JobFill works on most job application platforms, with enhanced support for:
- Workday
- Lever
- Greenhouse
- BambooHR
- SmartRecruiters
- SuccessFactors
- Generic application forms

## Privacy

JobFill values your privacy:
- All data processing happens locally in your browser
- Your resume and personal information are stored only in your browser's local storage
- No data is sent to external servers

## Troubleshooting

If you encounter issues:

1. **Resume Parsing Issues**:
   - Try a different file format (PDF, DOCX, or TXT)
   - Ensure your resume is properly formatted
   - Use standard section headers (Experience, Education, Skills)

2. **Form Detection Issues**:
   - Some job sites use complex or unusual form structures
   - Try clicking "Fill Current Page" manually from the extension popup

3. **Extension Not Working**:
   - Make sure you've granted the necessary permissions
   - Check if the site is blocking browser extensions
   - Try reloading the extension from the chrome://extensions page

## Development

JobFill is built using:
- JavaScript
- Chrome Extension APIs
- HTML/CSS for the popup interface

The extension consists of several key components:
- **Popup Interface**: For uploading and managing resume data
- **Background Script**: For handling communications and processing resumes
- **Content Script**: For executing the auto-fill on job sites
- **Resume Parser**: For extracting structured data from resumes
- **Form Detector**: For identifying form fields on job sites
- **Auto-Filler**: For filling form fields with resume data
- **Site-Specific Adapters**: For handling different job application platforms

## Contributing

Contributions are welcome! Feel free to submit a pull request or open an issue for:
- Bug fixes
- New features
- Additional site adapters
- Improved resume parsing

## License

[MIT License](LICENSE)

## Acknowledgements

- Thanks to all contributors and beta testers
- Special thanks to the open-source libraries and tools that made this project possible
