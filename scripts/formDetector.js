/**
 * Form Detector Module
 *
 * This module handles detecting and categorizing form fields on job application pages.
 */

class FormDetector {
    /**
     * Detect form fields on the current page
     * @returns {array} - Array of detected field objects
     */
    static detectFields() {
        // Get all input elements
        const inputElements = document.querySelectorAll('input, select, textarea');

        // Process each element
        const detectedFields = Array.from(inputElements)
            .filter(this.isRelevantField)
            .map(this.analyzeField);

        return detectedFields;
    }

    /**
     * Check if a field is relevant for auto-filling
     * @param {Element} field - Form field element
     * @returns {boolean} - Whether the field is relevant
     */
    static isRelevantField(field) {
        // Skip hidden or disabled fields
        if (
            field.type === 'hidden' ||
            field.disabled ||
            field.readOnly ||
            field.type === 'submit' ||
            field.type === 'button' ||
            field.type === 'file'
        ) {
            return false;
        }

        // Skip fields that should be filled by the user manually
        // (e.g., passwords, security questions)
        if (
            field.type === 'password' ||
            field.autocomplete === 'new-password' ||
            field.name?.includes('captcha') ||
            field.id?.includes('captcha') ||
            field.name?.includes('security') ||
            field.id?.includes('security')
        ) {
            return false;
        }

        return true;
    }

    /**
     * Analyze a form field to determine its purpose
     * @param {Element} field - Form field element
     * @returns {object} - Field analysis information
     */
    static analyzeField(field) {
        // Get field metadata
        const metadata = FormDetector.getFieldMetadata(field);

        // Determine field category and subcategory
        const { category, subcategory } = FormDetector.categorizeField(metadata);

        // Calculate confidence score for the categorization
        const confidence = FormDetector.calculateConfidence(metadata, category, subcategory);

        return {
            element: field,
            metadata,
            category,
            subcategory,
            confidence
        };
    }

    /**
     * Get metadata about a form field
     * @param {Element} field - Form field element
     * @returns {object} - Field metadata
     */
    static getFieldMetadata(field) {
        // Basic field properties
        const id = field.id ? field.id.toLowerCase() : '';
        const name = field.name ? field.name.toLowerCase() : '';
        const type = field.type ? field.type.toLowerCase() : '';
        const placeholder = field.placeholder ? field.placeholder.toLowerCase() : '';
        const className = field.className ? field.className.toLowerCase() : '';
        const value = field.value ? field.value.toLowerCase() : '';
        const autocomplete = field.autocomplete ? field.autocomplete.toLowerCase() : '';

        // Get attributes
        const ariaLabel = field.getAttribute('aria-label') || '';
        const ariaLabelledBy = field.getAttribute('aria-labelledby') || '';
        const ariaDescribedBy = field.getAttribute('aria-describedby') || '';
        const title = field.getAttribute('title') || '';
        const dataAttributes = {};

        // Collect all data-* attributes
        Array.from(field.attributes)
            .filter(attr => attr.name.startsWith('data-'))
            .forEach(attr => {
                dataAttributes[attr.name] = attr.value.toLowerCase();
            });

        // Find associated label
        let labelText = '';
        let labelForField = false;

        // Check for a label with 'for' attribute matching this field's id
        if (field.id) {
            const labelElement = document.querySelector(`label[for="${field.id}"]`);
            if (labelElement) {
                labelText = labelElement.textContent.trim().toLowerCase();
                labelForField = true;
            }
        }

        // If no explicit label found, check for parent label
        if (!labelText) {
            let parentNode = field.parentElement;
            while (parentNode && parentNode.nodeName !== 'BODY') {
                if (parentNode.nodeName === 'LABEL') {
                    labelText = parentNode.textContent.trim().toLowerCase();
                    break;
                }
                parentNode = parentNode.parentElement;
            }
        }

        // If still no label, check for nearby text that might be a label
        if (!labelText) {
            labelText = this.findNearbyLabelText(field);
        }

        // Get field constraints
        const required = field.required;
        const pattern = field.pattern || '';
        const minLength = field.minLength || 0;
        const maxLength = field.maxLength || 0;
        const min = field.min || '';
        const max = field.max || '';

        // For select elements, get options
        const options = field.nodeName === 'SELECT'
            ? Array.from(field.options).map(option => option.text.toLowerCase())
            : [];

        return {
            id,
            name,
            type,
            placeholder,
            className,
            value,
            autocomplete,
            ariaLabel: ariaLabel.toLowerCase(),
            ariaLabelledBy: ariaLabelledBy.toLowerCase(),
            ariaDescribedBy: ariaDescribedBy.toLowerCase(),
            title: title.toLowerCase(),
            dataAttributes,
            labelText,
            labelForField,
            required,
            pattern,
            minLength,
            maxLength,
            min,
            max,
            options
        };
    }

    /**
     * Find text near a field that might be acting as a label
     * @param {Element} field - Form field element
     * @returns {string} - Nearby text
     */
    static findNearbyLabelText(field) {
        let nearbyText = '';

        // Check previous sibling node
        let prevNode = field.previousSibling;
        while (prevNode && !nearbyText) {
            if (prevNode.nodeType === Node.TEXT_NODE) {
                nearbyText = prevNode.textContent.trim();
            } else if (prevNode.nodeType === Node.ELEMENT_NODE) {
                // Skip hidden elements
                const style = window.getComputedStyle(prevNode);
                if (style.display !== 'none' && style.visibility !== 'hidden') {
                    nearbyText = prevNode.textContent.trim();
                }
            }
            prevNode = prevNode.previousSibling;
        }

        // If nothing found, check parent's previous sibling
        if (!nearbyText && field.parentElement) {
            prevNode = field.parentElement.previousSibling;
            while (prevNode && !nearbyText) {
                if (prevNode.nodeType === Node.TEXT_NODE) {
                    nearbyText = prevNode.textContent.trim();
                } else if (prevNode.nodeType === Node.ELEMENT_NODE) {
                    // Skip hidden elements
                    const style = window.getComputedStyle(prevNode);
                    if (style.display !== 'none' && style.visibility !== 'hidden') {
                        nearbyText = prevNode.textContent.trim();
                    }
                }
                prevNode = prevNode.previousSibling;
            }
        }

        return nearbyText.toLowerCase();
    }

    /**
     * Categorize a form field based on its metadata
     * @param {object} metadata - Field metadata
     * @returns {object} - Field category and subcategory
     */
    static categorizeField(metadata) {
        // Define patterns for different field categories
        const patterns = {
            personal: {
                name: [
                    'name', 'full name', 'full_name',
                ],
                firstName: [
                    'first name', 'firstname', 'first_name', 'fname', 'given name', 'given_name'
                ],
                lastName: [
                    'last name', 'lastname', 'last_name', 'lname', 'family name', 'surname'
                ],
                middleName: [
                    'middle name', 'middlename', 'middle_name', 'mname', 'middle initial'
                ],
                email: [
                    'email', 'e-mail', 'email address', 'e-mail address'
                ],
                phone: [
                    'phone', 'telephone', 'mobile', 'cell', 'phone number'
                ],
                address: [
                    'address', 'street', 'street address', 'address line', 'mailing address'
                ],
                city: [
                    'city', 'town', 'municipality'
                ],
                state: [
                    'state', 'province', 'region'
                ],
                zipCode: [
                    'zip', 'zipcode', 'zip code', 'postal', 'postal code'
                ],
                country: [
                    'country', 'nation'
                ]
            },
            education: {
                school: [
                    'school', 'university', 'college', 'institution', 'academy', 'educational institution'
                ],
                degree: [
                    'degree', 'degree type', 'diploma', 'certification', 'qualification'
                ],
                fieldOfStudy: [
                    'field of study', 'major', 'specialization', 'concentration', 'discipline'
                ],
                graduationDate: [
                    'graduation date', 'graduation', 'graduated', 'completion date', 'completion'
                ],
                gpa: [
                    'gpa', 'grade point average', 'grade average', 'academic average'
                ]
            },
            experience: {
                company: [
                    'company', 'employer', 'organization', 'firm', 'business'
                ],
                title: [
                    'job title', 'title', 'position', 'role', 'designation'
                ],
                startDate: [
                    'start date', 'from date', 'employment start', 'date from'
                ],
                endDate: [
                    'end date', 'to date', 'employment end', 'date to'
                ],
                description: [
                    'description', 'job description', 'responsibilities', 'duties'
                ],
                currentJob: [
                    'current job', 'current position', 'current employer', 'present employer'
                ]
            },
            skills: {
                skills: [
                    'skills', 'abilities', 'competencies', 'expertise', 'proficiencies'
                ],
                languages: [
                    'languages', 'spoken languages', 'programming languages'
                ],
                certifications: [
                    'certifications', 'certificates', 'credentials', 'licenses'
                ]
            },
            other: {
                salary: [
                    'salary', 'compensation', 'pay', 'wage', 'remuneration', 'expected salary'
                ],
                startDate: [
                    'start date', 'availability', 'available from', 'when can you start'
                ],
                relocation: [
                    'relocation', 'willing to relocate', 'can relocate', 'relocate'
                ],
                citizenship: [
                    'citizenship', 'citizen', 'work authorization', 'authorized to work', 'visa'
                ],
                linkedin: [
                    'linkedin', 'linkedin url', 'linkedin profile'
                ],
                website: [
                    'website', 'personal website', 'portfolio', 'blog'
                ],
                github: [
                    'github', 'github url', 'github profile', 'gitlab'
                ],
                twitter: [
                    'twitter', 'twitter url', 'twitter handle', 'x.com'
                ],
                reference: [
                    'reference', 'references', 'referrer', 'referral'
                ],
                coverLetter: [
                    'cover letter', 'cover_letter', 'coverletter', 'letter of interest'
                ],
                resume: [
                    'resume', 'cv', 'curriculum vitae', 'upload resume', 'upload cv'
                ]
            }
        };

        // Initialize to unknown category
        let category = 'unknown';
        let subcategory = 'unknown';
        let highestMatchScore = 0;

        // Look through all patterns to find the best match
        for (const [cat, subcats] of Object.entries(patterns)) {
            for (const [subcat, patterns] of Object.entries(subcats)) {
                const matchScore = this.calculateMatchScore(metadata, patterns);

                if (matchScore > highestMatchScore) {
                    highestMatchScore = matchScore;
                    category = cat;
                    subcategory = subcat;
                }
            }
        }

        // Field type heuristics (if we couldn't match based on text)
        if (category === 'unknown' || highestMatchScore < 3) {
            if (metadata.type === 'email') {
                category = 'personal';
                subcategory = 'email';
            } else if (metadata.type === 'tel') {
                category = 'personal';
                subcategory = 'phone';
            } else if (metadata.autocomplete === 'address-line1') {
                category = 'personal';
                subcategory = 'address';
            } else if (metadata.autocomplete === 'address-level2') {
                category = 'personal';
                subcategory = 'city';
            } else if (metadata.autocomplete === 'address-level1') {
                category = 'personal';
                subcategory = 'state';
            } else if (metadata.autocomplete === 'postal-code') {
                category = 'personal';
                subcategory = 'zipCode';
            } else if (metadata.autocomplete === 'country') {
                category = 'personal';
                subcategory = 'country';
            }
        }

        return { category, subcategory };
    }

    /**
     * Calculate a match score between field metadata and patterns
     * @param {object} metadata - Field metadata
     * @param {array} patterns - Array of patterns to match
     * @returns {number} - Match score
     */
    static calculateMatchScore(metadata, patterns) {
        let score = 0;

        // Check each pattern against multiple field properties
        for (const pattern of patterns) {
            // Check ID
            if (metadata.id.includes(pattern)) {
                score += 3;
            }

            // Check name attribute
            if (metadata.name.includes(pattern)) {
                score += 3;
            }

            // Check label text
            if (metadata.labelText.includes(pattern)) {
                score += 5; // Labels are strong indicators

                if (metadata.labelForField) {
                    score += 2; // Explicit label-for relationship is even stronger
                }
            }

            // Check placeholder
            if (metadata.placeholder.includes(pattern)) {
                score += 2;
            }

            // Check aria-label
            if (metadata.ariaLabel.includes(pattern)) {
                score += 3;
            }

            // Check title
            if (metadata.title.includes(pattern)) {
                score += 1;
            }

            // Check for data attributes
            for (const [key, value] of Object.entries(metadata.dataAttributes)) {
                if (key.includes(pattern) || value.includes(pattern)) {
                    score += 1;
                }
            }
        }

        return score;
    }

    /**
     * Calculate confidence score for field categorization
     * @param {object} metadata - Field metadata
     * @param {string} category - Field category
     * @param {string} subcategory - Field subcategory
     * @returns {number} - Confidence score (0-1)
     */
    static calculateConfidence(metadata, category, subcategory) {
        if (category === 'unknown') {
            return 0;
        }

        // Base confidence on how strong the categorization evidence is
        let confidence = 0.5; // Start with neutral confidence

        // Explicit label-for relationship is very strong evidence
        if (metadata.labelForField) {
            confidence += 0.3;
        }

        // Email, phone, etc. field types are strong indicators
        if (
            (subcategory === 'email' && metadata.type === 'email') ||
            (subcategory === 'phone' && metadata.type === 'tel')
        ) {
            confidence += 0.3;
        }

        // Autocomplete attributes are very good indicators
        if (metadata.autocomplete) {
            if (
                (subcategory === 'firstName' && metadata.autocomplete === 'given-name') ||
                (subcategory === 'lastName' && metadata.autocomplete === 'family-name') ||
                (subcategory === 'email' && metadata.autocomplete === 'email') ||
                (subcategory === 'phone' && metadata.autocomplete === 'tel') ||
                (subcategory === 'address' && metadata.autocomplete.includes('address-line')) ||
                (subcategory === 'city' && metadata.autocomplete === 'address-level2') ||
                (subcategory === 'state' && metadata.autocomplete === 'address-level1') ||
                (subcategory === 'zipCode' && metadata.autocomplete === 'postal-code') ||
                (subcategory === 'country' && metadata.autocomplete === 'country')
            ) {
                confidence += 0.3;
            }
        }

        // Name patterns in ID or name attributes are good indicators
        if (metadata.id.includes(subcategory) || metadata.name.includes(subcategory)) {
            confidence += 0.2;
        }

        // Required fields with a clear label are more likely important fields
        if (metadata.required && metadata.labelText) {
            confidence += 0.1;
        }

        // For select elements, check if options match expectations for the field type
        if (metadata.options.length > 0) {
            if (
                (subcategory === 'country' && metadata.options.includes('united states')) ||
                (subcategory === 'state' && metadata.options.includes('california')) ||
                (subcategory === 'degree' && (
                    metadata.options.includes('bachelor') ||
                    metadata.options.includes('master') ||
                    metadata.options.includes('phd')
                ))
            ) {
                confidence += 0.2;
            }
        }

        // Cap confidence at 1.0
        return Math.min(confidence, 1.0);
    }
}