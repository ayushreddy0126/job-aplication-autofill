/**
 * Lever Site Adapter
 *
 * Handles the specific form structure of Lever job applications.
 */

class LeverAdapter {
    /**
     * Detect if the current page is a Lever application form
     * @returns {boolean} - Whether the current page is a Lever form
     */
    static isLeverForm() {
        return (
            window.location.hostname.includes('lever.co') ||
            document.querySelector('form[data-form-type="application"]') !== null ||
            document.querySelector('.application-form') !== null
        );
    }

    /**
     * Detect form fields in Lever's form structure
     * @returns {Array} - Array of field objects
     */
    static detectFields() {
        const formDetector = window.FormDetector || FormDetector;

        // Lever typically uses a more standard form structure
        const fields = formDetector.detectFields();

        // Enhance field info with Lever-specific metadata
        return fields.map(field => this.enhanceFieldInfo(field));
    }

    /**
     * Enhance field information with Lever-specific details
     * @param {Object} field - Field object
     * @returns {Object} - Enhanced field object
     */
    static enhanceFieldInfo(field) {
        const { element, metadata } = field;

        // Lever often uses specific classes for field types
        const fieldWrapper = this.findFieldWrapper(element);
        let leverFieldType = null;

        if (fieldWrapper) {
            const wrapperClasses = fieldWrapper.className.split(/\s+/);

            // Extract field type from wrapper classes
            const typeClasses = wrapperClasses.filter(cls =>
                cls.includes('field-') ||
                cls.includes('application-') ||
                cls.includes('question-')
            );

            if (typeClasses.length > 0) {
                leverFieldType = typeClasses.join(' ');
            }

            // Check for required fields
            const isRequired =
                fieldWrapper.classList.contains('required') ||
                fieldWrapper.querySelector('.required-marker') !== null;

            // Update metadata
            field.metadata = {
                ...metadata,
                leverFieldType,
                isRequired: isRequired || metadata.required
            };

            // Recategorize field if needed
            const { category, subcategory } = this.categorizeLeverField(field.metadata);
            field.category = category;
            field.subcategory = subcategory;

            // Recalculate confidence
            field.confidence = this.calculateLeverConfidence(field.metadata, category, subcategory);
        }

        return field;
    }

    /**
     * Find the wrapper element for a field
     * @param {Element} element - Field element
     * @returns {Element|null} - Wrapper element
     */
    static findFieldWrapper(element) {
        // Lever typically wraps fields in divs with specific classes
        let parent = element.parentElement;

        while (parent && parent.tagName !== 'BODY') {
            if (
                parent.classList.contains('application-field') ||
                parent.classList.contains('input-field') ||
                parent.classList.contains('field-group')
            ) {
                return parent;
            }
            parent = parent.parentElement;
        }

        return null;
    }

    /**
     * Categorize a Lever field based on metadata
     * @param {Object} metadata - Field metadata
     * @returns {Object} - Category and subcategory
     */
    static categorizeLeverField(metadata) {
        const { id, name, labelText, leverFieldType } = metadata;

        // Lever often uses standardized naming conventions

        // Resume field (usually a file upload)
        if (
            name === 'resume' ||
            id.includes('resume') ||
            labelText.includes('resume') ||
            labelText.includes('cv')
        ) {
            return { category: 'other', subcategory: 'resume' };
        }

        // Cover letter field
        if (
            name === 'coverLetter' ||
            id.includes('cover') ||
            labelText.includes('cover letter')
        ) {
            return { category: 'other', subcategory: 'coverLetter' };
        }

        // Name fields
        if (name === 'name' || id === 'name' || labelText.includes('full name')) {
            return { category: 'personal', subcategory: 'name' };
        }

        if (name === 'email' || id === 'email' || labelText.includes('email')) {
            return { category: 'personal', subcategory: 'email' };
        }

        if (name === 'phone' || id === 'phone' || labelText.includes('phone')) {
            return { category: 'personal', subcategory: 'phone' };
        }

        if (name === 'org' || labelText.includes('company') || labelText.includes('current company')) {
            return { category: 'experience', subcategory: 'company' };
        }

        // LinkedIn URL field
        if (
            name === 'urls[LinkedIn]' ||
            id.includes('linkedin') ||
            labelText.includes('linkedin')
        ) {
            return { category: 'other', subcategory: 'linkedin' };
        }

        // GitHub URL field
        if (
            name === 'urls[GitHub]' ||
            id.includes('github') ||
            labelText.includes('github')
        ) {
            return { category: 'other', subcategory: 'github' };
        }

        // Website/portfolio URL field
        if (
            name === 'urls[Portfolio]' ||
            id.includes('website') ||
            id.includes('portfolio') ||
            labelText.includes('website') ||
            labelText.includes('portfolio')
        ) {
            return { category: 'other', subcategory: 'website' };
        }

        // If no specific match, use generic categorization
        const formDetector = window.FormDetector || FormDetector;
        return formDetector.categorizeField(metadata);
    }

    /**
     * Calculate confidence score for Lever field categorization
     * @param {Object} metadata - Field metadata
     * @param {string} category - Field category
     * @param {string} subcategory - Field subcategory
     * @returns {number} - Confidence score (0-1)
     */
    static calculateLeverConfidence(metadata, category, subcategory) {
        // Start with base confidence
        const formDetector = window.FormDetector || FormDetector;
        let confidence = formDetector.calculateConfidence(metadata, category, subcategory);

        // Lever has fairly standardized forms, so we can be more confident
        if (metadata.leverFieldType) {
            confidence = Math.min(confidence + 0.15, 1.0);
        }

        // Name fields in Lever are almost always full name
        if (category === 'personal' && subcategory === 'name') {
            confidence = Math.min(confidence + 0.2, 1.0);
        }

        return confidence;
    }

    /**
     * Handle common Lever form questions
     */
    static handleCommonQuestions() {
        this.handleTextareaQuestions();
        this.handleCheckboxQuestions();
        this.handleSelectQuestions();
    }

    /**
     * Handle common textarea questions
     */
    static handleTextareaQuestions() {
        // Find all textareas with potential questions
        const textareas = document.querySelectorAll('textarea');

        textareas.forEach(textarea => {
            const wrapper = this.findFieldWrapper(textarea);
            if (!wrapper) return;

            const labelText = wrapper.textContent.toLowerCase();

            // Skip required fields
            if (wrapper.classList.contains('required')) return;

            // Don't fill fields that are already filled
            if (textarea.value.trim()) return;

            // Look for common questions and provide reasonable defaults

            // Salary expectations
            if (
                labelText.includes('salary') ||
                labelText.includes('compensation') ||
                labelText.includes('expected') ||
                labelText.includes('desired')
            ) {
                textarea.value = 'My salary expectations are flexible and negotiable based on the total compensation package.';
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
                textarea.dispatchEvent(new Event('change', { bubbles: true }));
            }

            // Additional information
            else if (
                labelText.includes('additional') ||
                labelText.includes('anything else') ||
                labelText.includes('other comments')
            ) {
                textarea.value = 'I am excited about this opportunity and look forward to discussing how my skills align with your needs.';
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
                textarea.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
    }

    /**
     * Handle common checkbox questions
     */
    static handleCheckboxQuestions() {
        // Find all checkboxes
        const checkboxes = document.querySelectorAll('input[type="checkbox"]');

        checkboxes.forEach(checkbox => {
            const wrapper = this.findFieldWrapper(checkbox);
            if (!wrapper) return;

            const labelText = wrapper.textContent.toLowerCase();

            // Check authorization or agreement boxes
            if (
                labelText.includes('authorized to work') ||
                labelText.includes('legally authorized') ||
                labelText.includes('work authorization')
            ) {
                checkbox.checked = true;
                checkbox.dispatchEvent(new Event('change', { bubbles: true }));
            }

            // Check consent for processing data
            if (
                labelText.includes('consent') ||
                labelText.includes('agree') ||
                labelText.includes('terms') ||
                labelText.includes('privacy')
            ) {
                checkbox.checked = true;
                checkbox.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
    }

    /**
     * Handle common select dropdown questions
     */
    static handleSelectQuestions() {
        // Find all select elements
        const selects = document.querySelectorAll('select');

        selects.forEach(select => {
            const wrapper = this.findFieldWrapper(select);
            if (!wrapper) return;

            const labelText = wrapper.textContent.toLowerCase();

            // Don't fill fields that are already filled
            if (select.value) return;

            // Handle pronoun selection
            if (
                labelText.includes('pronoun') ||
                labelText.includes('gender')
            ) {
                const preferNotOption = Array.from(select.options).find(option =>
                    option.text.toLowerCase().includes('prefer not') ||
                    option.text.toLowerCase().includes('decline')
                );

                if (preferNotOption) {
                    select.value = preferNotOption.value;
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }

            // Handle how did you hear about us
            if (
                labelText.includes('how did you hear') ||
                labelText.includes('how you found') ||
                labelText.includes('referral source')
            ) {
                // Try to find "Job board" or similar option
                const jobBoardOption = Array.from(select.options).find(option =>
                    option.text.toLowerCase().includes('job board') ||
                    option.text.toLowerCase().includes('indeed') ||
                    option.text.toLowerCase().includes('linkedin')
                );

                if (jobBoardOption) {
                    select.value = jobBoardOption.value;
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
        });
    }
}

// Export the class if using modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LeverAdapter;
}