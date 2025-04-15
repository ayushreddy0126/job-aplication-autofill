/**
 * Greenhouse Site Adapter
 *
 * Handles the specific form structure of Greenhouse job applications.
 */

class GreenhouseAdapter {
    /**
     * Detect if the current page is a Greenhouse application form
     * @returns {boolean} - Whether the current page is a Greenhouse form
     */
    static isGreenhouseForm() {
        return (
            window.location.hostname.includes('greenhouse.io') ||
            document.querySelector('form#application_form') !== null ||
            document.querySelector('div[data-source="greenhouse"]') !== null
        );
    }

    /**
     * Detect form fields in Greenhouse's form structure
     * @returns {Array} - Array of field objects
     */
    static detectFields() {
        const formDetector = window.FormDetector || FormDetector;

        // First get standard fields using the general detector
        const fields = formDetector.detectFields();

        // Enhance with Greenhouse-specific information
        return fields.map(field => this.enhanceGreenhouseField(field));
    }

    /**
     * Enhance field info with Greenhouse-specific metadata
     * @param {Object} field - Field object
     * @returns {Object} - Enhanced field object
     */
    static enhanceGreenhouseField(field) {
        const { element, metadata } = field;

        // Greenhouse uses field wrappers with specific classes
        const fieldWrapper = this.findFieldWrapper(element);
        let greenhouseFieldType = null;
        let greenhouseFieldId = null;

        if (fieldWrapper) {
            // Extract field info from the wrapper
            greenhouseFieldId = fieldWrapper.id || '';
            greenhouseFieldType = fieldWrapper.className || '';

            // Check if the field is marked as required
            const isRequired =
                fieldWrapper.classList.contains('required') ||
                fieldWrapper.querySelector('.field-label.required') !== null ||
                fieldWrapper.querySelector('.asterisk') !== null;

            // Update metadata
            field.metadata = {
                ...metadata,
                greenhouseFieldId,
                greenhouseFieldType,
                isRequired: isRequired || metadata.required
            };

            // Recategorize field if needed
            const { category, subcategory } = this.categorizeGreenhouseField(field.metadata);
            field.category = category;
            field.subcategory = subcategory;

            // Recalculate confidence
            field.confidence = this.calculateGreenhouseConfidence(field.metadata, category, subcategory);
        }

        return field;
    }

    /**
     * Find the wrapper element for a field
     * @param {Element} element - Field element
     * @returns {Element|null} - Wrapper element
     */
    static findFieldWrapper(element) {
        // Greenhouse typically wraps fields in divs with specific classes
        let parent = element.parentElement;

        while (parent && parent.tagName !== 'BODY') {
            if (
                parent.classList.contains('field') ||
                parent.classList.contains('form-field') ||
                parent.classList.contains('question')
            ) {
                return parent;
            }
            parent = parent.parentElement;
        }

        return null;
    }

    /**
     * Categorize a Greenhouse field based on metadata
     * @param {Object} metadata - Field metadata
     * @returns {Object} - Category and subcategory
     */
    static categorizeGreenhouseField(metadata) {
        const { id, name, labelText, greenhouseFieldId } = metadata;

        // Greenhouse uses standard field IDs for common fields

        // Name fields
        if (
            id === 'first_name' ||
            name === 'first_name' ||
            greenhouseFieldId === 'first_name_field'
        ) {
            return { category: 'personal', subcategory: 'firstName' };
        }

        if (
            id === 'last_name' ||
            name === 'last_name' ||
            greenhouseFieldId === 'last_name_field'
        ) {
            return { category: 'personal', subcategory: 'lastName' };
        }

        // Email field
        if (
            id === 'email' ||
            name === 'email' ||
            greenhouseFieldId === 'email_field'
        ) {
            return { category: 'personal', subcategory: 'email' };
        }

        // Phone field
        if (
            id === 'phone' ||
            name === 'phone' ||
            greenhouseFieldId === 'phone_field'
        ) {
            return { category: 'personal', subcategory: 'phone' };
        }

        // LinkedIn URL field
        if (
            id === 'linkedin_url' ||
            name === 'urls[LinkedIn]' ||
            id.includes('linkedin') ||
            greenhouseFieldId.includes('linkedin')
        ) {
            return { category: 'other', subcategory: 'linkedin' };
        }

        // Website URL field
        if (
            id === 'website' ||
            name === 'website' ||
            id.includes('website') ||
            greenhouseFieldId.includes('website')
        ) {
            return { category: 'other', subcategory: 'website' };
        }

        // Address fields
        if (
            id.includes('address') ||
            name.includes('address') ||
            greenhouseFieldId.includes('address')
        ) {
            if (id.includes('city') || name.includes('city')) {
                return { category: 'personal', subcategory: 'city' };
            }
            if (id.includes('state') || name.includes('state')) {
                return { category: 'personal', subcategory: 'state' };
            }
            if (id.includes('zip') || name.includes('zip') || id.includes('postal') || name.includes('postal')) {
                return { category: 'personal', subcategory: 'zipCode' };
            }

            return { category: 'personal', subcategory: 'address' };
        }

        // Education fields
        if (
            greenhouseFieldId.includes('education') ||
            greenhouseFieldId.includes('degree') ||
            greenhouseFieldId.includes('school')
        ) {
            if (greenhouseFieldId.includes('school') || labelText.includes('school') || labelText.includes('university')) {
                return { category: 'education', subcategory: 'school' };
            }
            if (greenhouseFieldId.includes('degree') || labelText.includes('degree')) {
                return { category: 'education', subcategory: 'degree' };
            }

            return { category: 'education', subcategory: 'school' };
        }

        // Work experience fields
        if (
            greenhouseFieldId.includes('experience') ||
            greenhouseFieldId.includes('employment') ||
            greenhouseFieldId.includes('job')
        ) {
            if (greenhouseFieldId.includes('company') || labelText.includes('company')) {
                return { category: 'experience', subcategory: 'company' };
            }
            if (greenhouseFieldId.includes('title') || labelText.includes('title')) {
                return { category: 'experience', subcategory: 'title' };
            }

            return { category: 'experience', subcategory: 'company' };
        }

        // Resume/CV upload
        if (
            id.includes('resume') ||
            name.includes('resume') ||
            id.includes('cv') ||
            name.includes('cv') ||
            labelText.includes('resume') ||
            labelText.includes('cv')
        ) {
            return { category: 'other', subcategory: 'resume' };
        }

        // Cover letter
        if (
            id.includes('cover_letter') ||
            name.includes('cover_letter') ||
            labelText.includes('cover letter')
        ) {
            return { category: 'other', subcategory: 'coverLetter' };
        }

        // If no specific match, use general categorization
        const formDetector = window.FormDetector || FormDetector;
        return formDetector.categorizeField(metadata);
    }

    /**
     * Calculate confidence score for Greenhouse field categorization
     * @param {Object} metadata - Field metadata
     * @param {string} category - Field category
     * @param {string} subcategory - Field subcategory
     * @returns {number} - Confidence score (0-1)
     */
    static calculateGreenhouseConfidence(metadata, category, subcategory) {
        // Start with base confidence
        const formDetector = window.FormDetector || FormDetector;
        let confidence = formDetector.calculateConfidence(metadata, category, subcategory);

        // Greenhouse has a standardized form structure, so we can be more confident
        if (metadata.greenhouseFieldId || metadata.greenhouseFieldType) {
            confidence = Math.min(confidence + 0.15, 1.0);
        }

        // Especially high confidence for standard fields
        if (
            (category === 'personal' && (
                subcategory === 'firstName' ||
                subcategory === 'lastName' ||
                subcategory === 'email' ||
                subcategory === 'phone'
            )) ||
            (category === 'other' && (
                subcategory === 'resume' ||
                subcategory === 'coverLetter'
            ))
        ) {
            confidence = Math.min(confidence + 0.2, 1.0);
        }

        return confidence;
    }

    /**
     * Handle the multi-page application flow in Greenhouse
     */
    static handleApplicationFlow() {
        // First handle any common questions
        this.handleCommonQuestions();

        // Then try to navigate to the next page if needed
        this.navigateToNextPage();
    }

    /**
     * Navigate to the next page of the application
     * @returns {boolean} - Whether navigation was successful
     */
    static navigateToNextPage() {
        // Find "Next" or "Submit" buttons
        const nextButtons = Array.from(document.querySelectorAll('button, input[type="submit"]')).filter(button => {
            const text = button.textContent.toLowerCase().trim() || button.value.toLowerCase().trim();
            return (
                text === 'next' ||
                text === 'continue' ||
                text === 'submit application' ||
                text === 'submit'
            );
        });

        if (nextButtons.length > 0) {
            // Click the first matching button
            nextButtons[0].click();
            return true;
        }

        return false;
    }

    /**
     * Handle common Greenhouse questions
     */
    static handleCommonQuestions() {
        // Handle EEO and demographic questions
        this.handleEEOQuestions();

        // Handle other common questions
        this.handleCommonSelectQuestions();
        this.handleCommonTextQuestions();
    }

    /**
     * Handle EEO (Equal Employment Opportunity) questions
     */
    static handleEEOQuestions() {
        // Look for EEO sections
        const eeoSections = Array.from(document.querySelectorAll('fieldset, div.field-group, section')).filter(section => {
            const text = section.textContent.toLowerCase();
            return (
                text.includes('equal employment opportunity') ||
                text.includes('eeo') ||
                text.includes('gender') ||
                text.includes('race') ||
                text.includes('ethnicity') ||
                text.includes('veteran status') ||
                text.includes('disability')
            );
        });

        eeoSections.forEach(section => {
            // Find select elements in the section
            const selects = section.querySelectorAll('select');

            selects.forEach(select => {
                // Look for "Decline to answer" or similar options
                const options = Array.from(select.options);
                const declineOption = options.find(option => {
                    const text = option.text.toLowerCase();
                    return (
                        text.includes('decline') ||
                        text.includes('prefer not') ||
                        text.includes('do not wish') ||
                        text.includes('choose not')
                    );
                });

                if (declineOption) {
                    select.value = declineOption.value;
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });

            // Find radio buttons or checkboxes for "No" answers
            const radioButtons = section.querySelectorAll('input[type="radio"]');

            radioButtons.forEach(radio => {
                const labelElement = document.querySelector(`label[for="${radio.id}"]`);
                if (labelElement) {
                    const labelText = labelElement.textContent.toLowerCase();

                    if (
                        labelText.includes('no') ||
                        labelText.includes('not') ||
                        labelText.includes('decline') ||
                        labelText.includes('prefer not')
                    ) {
                        radio.checked = true;
                        radio.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }
            });
        });
    }

    /**
     * Handle common select dropdown questions
     */
    static handleCommonSelectQuestions() {
        // Find select elements
        const selects = document.querySelectorAll('select');

        selects.forEach(select => {
            // Skip if already selected
            if (select.value) return;

            const wrapper = this.findFieldWrapper(select);
            if (!wrapper) return;

            const labelText = wrapper.textContent.toLowerCase();

            // Handle reference source questions
            if (
                labelText.includes('how did you hear') ||
                labelText.includes('how you found') ||
                labelText.includes('what source')
            ) {
                const options = Array.from(select.options);

                // Try to find a job board option
                const sourceOption = options.find(option => {
                    const text = option.text.toLowerCase();
                    return (
                        text.includes('job board') ||
                        text.includes('indeed') ||
                        text.includes('linkedin') ||
                        text.includes('internet search')
                    );
                });

                if (sourceOption) {
                    select.value = sourceOption.value;
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }

            // Handle salary/compensation expectation questions
            if (
                labelText.includes('salary') ||
                labelText.includes('compensation')
            ) {
                const options = Array.from(select.options);

                // Try to find a middle option
                if (options.length > 2) {
                    const middleOption = options[Math.floor(options.length / 2)];
                    select.value = middleOption.value;
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
        });
    }

    /**
     * Handle common text input questions
     */
    static handleCommonTextQuestions() {
        // Find text inputs and textareas
        const textInputs = document.querySelectorAll('input[type="text"], textarea');

        textInputs.forEach(input => {
            // Skip if already filled
            if (input.value.trim()) return;

            const wrapper = this.findFieldWrapper(input);
            if (!wrapper) return;

            // Skip required fields
            if (
                input.required ||
                wrapper.classList.contains('required') ||
                wrapper.querySelector('.required')
            ) {
                return;
            }

            const labelText = wrapper.textContent.toLowerCase();

            // Handle salary expectation questions
            if (
                labelText.includes('salary') ||
                labelText.includes('compensation')
            ) {
                input.value = 'Negotiable based on total compensation package';
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
            }

            // Handle referral questions
            if (
                labelText.includes('referral') ||
                labelText.includes('referred by')
            ) {
                input.value = 'N/A';
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
    }
}

// Export the class if using modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GreenhouseAdapter;
}