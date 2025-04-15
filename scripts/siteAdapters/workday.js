/**
 * Workday Site Adapter
 *
 * Handles the specific form structure of Workday job applications.
 */

class WorkdayAdapter {
    /**
     * Detect if the current page is a Workday application form
     * @returns {boolean} - Whether the current page is a Workday form
     */
    static isWorkdayForm() {
        return (
            window.location.hostname.includes('workday.com') ||
            window.location.hostname.includes('myworkdayjobs.com') ||
            document.querySelector('div[data-automation-id]') !== null
        );
    }

    /**
     * Get all relevant iframes that may contain form elements
     * @returns {Array} - Array of iframe elements
     */
    static getFormIframes() {
        return Array.from(document.querySelectorAll('iframe')).filter(iframe => {
            // Filter to potential form-containing iframes
            try {
                const iframeUrl = iframe.src || '';
                return (
                    iframeUrl.includes('workday.com') ||
                    iframe.id.includes('application') ||
                    iframe.name.includes('application')
                );
            } catch (e) {
                return false;
            }
        });
    }

    /**
     * Detect form fields in Workday's complex form structure
     * @returns {Array} - Array of field objects
     */
    static detectFields() {
        const fields = [];

        // First, get fields in the main document
        const mainDocFields = this.detectFieldsInDocument(document);
        fields.push(...mainDocFields);

        // Then, try to get fields from iframes
        const iframes = this.getFormIframes();

        iframes.forEach(iframe => {
            try {
                // Try to access the iframe's document
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                const iframeFields = this.detectFieldsInDocument(iframeDoc);
                fields.push(...iframeFields);
            } catch (e) {
                console.warn('Could not access iframe content:', e);
            }
        });

        return fields;
    }

    /**
     * Detect fields within a specific document
     * @param {Document} doc - Document to search in
     * @returns {Array} - Array of field objects
     */
    static detectFieldsInDocument(doc) {
        const formDetector = window.FormDetector || FormDetector;

        // Workday often uses specific data attributes
        const workdayFields = Array.from(doc.querySelectorAll('[data-automation-id]'));
        const fields = [];

        // Process each field with Workday-specific logic
        workdayFields.forEach(field => {
            if (
                field.tagName === 'INPUT' ||
                field.tagName === 'SELECT' ||
                field.tagName === 'TEXTAREA'
            ) {
                const fieldInfo = this.getWorkdayFieldInfo(field);
                fields.push(fieldInfo);
            }

            // Workday sometimes nests inputs inside divs with automation IDs
            const nestedInputs = field.querySelectorAll('input, select, textarea');
            if (nestedInputs.length > 0) {
                Array.from(nestedInputs).forEach(input => {
                    const fieldInfo = this.getWorkdayFieldInfo(input, field);
                    fields.push(fieldInfo);
                });
            }
        });

        // Also get regular form fields that might not have Workday-specific attributes
        const regularFields = formDetector.detectFields();
        fields.push(...regularFields);

        // Remove duplicates (fields that may have been detected multiple ways)
        return this.removeDuplicateFields(fields);
    }

    /**
     * Get field info for a Workday field
     * @param {Element} field - Field element
     * @param {Element} container - Optional container element with additional info
     * @returns {Object} - Field info object
     */
    static getWorkdayFieldInfo(field, container = null) {
        const formDetector = window.FormDetector || FormDetector;

        // Get standard field info first
        const baseInfo = formDetector.getFieldMetadata(field);

        // Enhance with Workday-specific attributes
        const automationId = field.getAttribute('data-automation-id') ||
            (container ? container.getAttribute('data-automation-id') : '');

        // Workday often uses data-automation-id to identify field purpose
        let enhancedLabelText = baseInfo.labelText;
        let workdayFieldType = null;

        if (automationId) {
            // The automation ID often contains info about the field
            const idParts = automationId.split('-');

            if (idParts.length > 1) {
                // Try to extract field type from the ID
                workdayFieldType = idParts.join(' ').toLowerCase();
            }

            // Look for a Workday-specific label nearby
            const potentialLabels = document.querySelectorAll(`[data-automation-label], [data-automation-id*="label"]`);

            for (const label of potentialLabels) {
                const labelText = label.textContent.trim().toLowerCase();

                // If the label is close to the field, it's likely related
                if (this.areElementsClose(field, label, 100)) {
                    enhancedLabelText = labelText;
                    break;
                }
            }
        }

        // Combine and return enhanced field info
        const enhancedInfo = {
            ...baseInfo,
            labelText: enhancedLabelText || baseInfo.labelText,
            workdayAutomationId: automationId,
            workdayFieldType
        };

        // Categorize field based on enhanced info
        const { category, subcategory } = this.categorizeWorkdayField(enhancedInfo);
        const confidence = this.calculateWorkdayConfidence(enhancedInfo, category, subcategory);

        return {
            element: field,
            metadata: enhancedInfo,
            category,
            subcategory,
            confidence
        };
    }

    /**
     * Check if two elements are close to each other on the page
     * @param {Element} elem1 - First element
     * @param {Element} elem2 - Second element
     * @param {number} maxDistance - Maximum distance in pixels
     * @returns {boolean} - Whether the elements are close
     */
    static areElementsClose(elem1, elem2, maxDistance) {
        try {
            const rect1 = elem1.getBoundingClientRect();
            const rect2 = elem2.getBoundingClientRect();

            const horizontalDistance = Math.abs(
                (rect1.left + rect1.right) / 2 - (rect2.left + rect2.right) / 2
            );

            const verticalDistance = Math.abs(
                (rect1.top + rect1.bottom) / 2 - (rect2.top + rect2.bottom) / 2
            );

            return horizontalDistance < maxDistance && verticalDistance < maxDistance;
        } catch (e) {
            return false;
        }
    }

    /**
     * Categorize a Workday field based on enhanced metadata
     * @param {Object} metadata - Field metadata
     * @returns {Object} - Category and subcategory
     */
    static categorizeWorkdayField(metadata) {
        // Workday-specific categorization logic
        const { id, name, labelText, workdayAutomationId, workdayFieldType } = metadata;

        // Look for specific Workday patterns
        if (workdayAutomationId) {
            // Common Workday field patterns
            if (workdayAutomationId.includes('email')) {
                return { category: 'personal', subcategory: 'email' };
            } else if (workdayAutomationId.includes('phone')) {
                return { category: 'personal', subcategory: 'phone' };
            } else if (workdayAutomationId.includes('name')) {
                if (workdayAutomationId.includes('first')) {
                    return { category: 'personal', subcategory: 'firstName' };
                } else if (workdayAutomationId.includes('last')) {
                    return { category: 'personal', subcategory: 'lastName' };
                } else {
                    return { category: 'personal', subcategory: 'name' };
                }
            } else if (workdayAutomationId.includes('address')) {
                if (workdayAutomationId.includes('line1') || workdayAutomationId.includes('street')) {
                    return { category: 'personal', subcategory: 'address' };
                } else if (workdayAutomationId.includes('city')) {
                    return { category: 'personal', subcategory: 'city' };
                } else if (workdayAutomationId.includes('state') || workdayAutomationId.includes('province')) {
                    return { category: 'personal', subcategory: 'state' };
                } else if (workdayAutomationId.includes('zip') || workdayAutomationId.includes('postal')) {
                    return { category: 'personal', subcategory: 'zipCode' };
                } else if (workdayAutomationId.includes('country')) {
                    return { category: 'personal', subcategory: 'country' };
                } else {
                    return { category: 'personal', subcategory: 'address' };
                }
            } else if (
                workdayAutomationId.includes('education') ||
                workdayAutomationId.includes('school') ||
                workdayAutomationId.includes('degree')
            ) {
                if (workdayAutomationId.includes('school') || workdayAutomationId.includes('institution')) {
                    return { category: 'education', subcategory: 'school' };
                } else if (workdayAutomationId.includes('degree')) {
                    return { category: 'education', subcategory: 'degree' };
                } else if (workdayAutomationId.includes('major') || workdayAutomationId.includes('field')) {
                    return { category: 'education', subcategory: 'fieldOfStudy' };
                } else if (workdayAutomationId.includes('gpa')) {
                    return { category: 'education', subcategory: 'gpa' };
                } else if (workdayAutomationId.includes('graduated') || workdayAutomationId.includes('completion')) {
                    return { category: 'education', subcategory: 'graduationDate' };
                } else {
                    return { category: 'education', subcategory: 'school' };
                }
            } else if (
                workdayAutomationId.includes('experience') ||
                workdayAutomationId.includes('employment') ||
                workdayAutomationId.includes('job')
            ) {
                if (workdayAutomationId.includes('company') || workdayAutomationId.includes('employer')) {
                    return { category: 'experience', subcategory: 'company' };
                } else if (workdayAutomationId.includes('title') || workdayAutomationId.includes('position')) {
                    return { category: 'experience', subcategory: 'title' };
                } else if (workdayAutomationId.includes('start')) {
                    return { category: 'experience', subcategory: 'startDate' };
                } else if (workdayAutomationId.includes('end')) {
                    return { category: 'experience', subcategory: 'endDate' };
                } else if (workdayAutomationId.includes('description') || workdayAutomationId.includes('duties')) {
                    return { category: 'experience', subcategory: 'description' };
                } else {
                    return { category: 'experience', subcategory: 'company' };
                }
            } else if (workdayAutomationId.includes('skill')) {
                return { category: 'skills', subcategory: 'skills' };
            } else if (
                workdayAutomationId.includes('veteran') ||
                workdayAutomationId.includes('military')
            ) {
                return { category: 'other', subcategory: 'veteranStatus' };
            }
        }

        // If no Workday-specific patterns matched, fall back to generic categorization
        const formDetector = window.FormDetector || FormDetector;
        const { category, subcategory } = formDetector.categorizeField(metadata);

        return { category, subcategory };
    }

    /**
     * Calculate confidence score for Workday field categorization
     * @param {Object} metadata - Field metadata
     * @param {string} category - Field category
     * @param {string} subcategory - Field subcategory
     * @returns {number} - Confidence score (0-1)
     */
    static calculateWorkdayConfidence(metadata, category, subcategory) {
        // Start with base confidence from metadata
        const formDetector = window.FormDetector || FormDetector;
        let confidence = formDetector.calculateConfidence(metadata, category, subcategory);

        // Boost confidence for fields with Workday-specific attributes
        if (metadata.workdayAutomationId) {
            confidence = Math.min(confidence + 0.2, 1.0);
        }

        return confidence;
    }

    /**
     * Remove duplicate field entries
     * @param {Array} fields - Array of field objects
     * @returns {Array} - De-duplicated fields
     */
    static removeDuplicateFields(fields) {
        const uniqueFields = [];
        const seenElements = new Set();

        fields.forEach(field => {
            // Use the element itself as a unique identifier
            if (!seenElements.has(field.element)) {
                seenElements.add(field.element);
                uniqueFields.push(field);
            }
        });

        return uniqueFields;
    }

    /**
     * Navigate through multi-page Workday forms
     * @returns {boolean} - Whether navigation was successful
     */
    static navigateToNextPage() {
        // Try to find the "Next" or "Continue" button
        const nextButtons = Array.from(document.querySelectorAll('button, a')).filter(button => {
            const text = button.textContent.toLowerCase().trim();
            return text === 'next' || text === 'continue' || text.includes('next') || text.includes('continue');
        });

        if (nextButtons.length > 0) {
            // Click the first matching button
            nextButtons[0].click();
            return true;
        }

        // Try Workday-specific patterns
        const workdayNextButtons = document.querySelectorAll('[data-automation-id="bottom-navigation-next-button"]');
        if (workdayNextButtons.length > 0) {
            workdayNextButtons[0].click();
            return true;
        }

        return false;
    }

    /**
     * Handle common Workday questions like veteran status
     */
    static handleCommonQuestions() {
        // Handle veteran status questions
        this.handleVeteranStatusQuestions();

        // Handle diversity questions (usually want to select "Decline to answer")
        this.handleDiversityQuestions();

        // Handle disability questions
        this.handleDisabilityQuestions();
    }

    /**
     * Handle veteran status questions on Workday forms
     */
    static handleVeteranStatusQuestions() {
        // Look for veteran status sections
        const veteranSections = Array.from(document.querySelectorAll('div, section, fieldset')).filter(section => {
            const text = section.textContent.toLowerCase();
            return (
                text.includes('veteran') ||
                text.includes('military') ||
                text.includes('armed forces')
            );
        });

        veteranSections.forEach(section => {
            // Look for "No" or "I am not a veteran" options
            const radioButtons = section.querySelectorAll('input[type="radio"]');

            radioButtons.forEach(radio => {
                const labelElement = document.querySelector(`label[for="${radio.id}"]`);
                if (labelElement) {
                    const labelText = labelElement.textContent.toLowerCase();

                    if (
                        labelText.includes('no') ||
                        labelText.includes('not a veteran') ||
                        labelText.includes('never served') ||
                        labelText.includes('do not identify')
                    ) {
                        radio.checked = true;
                        radio.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }
            });
        });
    }

    /**
     * Handle diversity questions on Workday forms
     */
    static handleDiversityQuestions() {
        // Look for diversity/EEO sections
        const diversitySections = Array.from(document.querySelectorAll('div, section, fieldset')).filter(section => {
            const text = section.textContent.toLowerCase();
            return (
                text.includes('equal employment opportunity') ||
                text.includes('eeo') ||
                text.includes('diversity') ||
                text.includes('gender') ||
                text.includes('ethnicity') ||
                text.includes('race')
            );
        });

        diversitySections.forEach(section => {
            // Look for "Decline to answer" options
            const radioButtons = section.querySelectorAll('input[type="radio"]');

            radioButtons.forEach(radio => {
                const labelElement = document.querySelector(`label[for="${radio.id}"]`);
                if (labelElement) {
                    const labelText = labelElement.textContent.toLowerCase();

                    if (
                        labelText.includes('decline') ||
                        labelText.includes('prefer not') ||
                        labelText.includes('do not wish') ||
                        labelText.includes('choose not')
                    ) {
                        radio.checked = true;
                        radio.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }
            });
        });
    }

    /**
     * Handle disability questions on Workday forms
     */
    static handleDisabilityQuestions() {
        // Look for disability sections
        const disabilitySections = Array.from(document.querySelectorAll('div, section, fieldset')).filter(section => {
            const text = section.textContent.toLowerCase();
            return (
                text.includes('disability') ||
                text.includes('disabilities') ||
                text.includes('disabled')
            );
        });

        disabilitySections.forEach(section => {
            // Look for "No" or "Decline to answer" options
            const radioButtons = section.querySelectorAll('input[type="radio"]');

            radioButtons.forEach(radio => {
                const labelElement = document.querySelector(`label[for="${radio.id}"]`);
                if (labelElement) {
                    const labelText = labelElement.textContent.toLowerCase();

                    if (
                        labelText.includes('no') ||
                        labelText.includes('do not') ||
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
}

// Export the class if using modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WorkdayAdapter;
}