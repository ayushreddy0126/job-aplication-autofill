/**
 * Site Adapter Factory
 *
 * This module determines which site-specific adapter to use for the current page.
 */

class AdapterFactory {
    /**
     * Get the appropriate adapter for the current page
     * @returns {Object} - Site adapter class
     */
    static getAdapter() {
        // Check for known job application sites
        if (WorkdayAdapter.isWorkdayForm()) {
            console.log('Using Workday adapter');
            return WorkdayAdapter;
        }
        else if (LeverAdapter.isLeverForm()) {
            console.log('Using Lever adapter');
            return LeverAdapter;
        }
        else if (GreenhouseAdapter.isGreenhouseForm()) {
            console.log('Using Greenhouse adapter');
            return GreenhouseAdapter;
        }

        // Check for other known application systems
        else if (this.isSmartRecruitersForm()) {
            console.log('Using SmartRecruiters adapter');
            return this.getSmartRecruitersAdapter();
        }
        else if (this.isBambooHRForm()) {
            console.log('Using BambooHR adapter');
            return this.getBambooHRAdapter();
        }
        else if (this.isSuccessFactorsForm()) {
            console.log('Using SuccessFactors adapter');
            return this.getSuccessFactorsAdapter();
        }

        // If no specific adapter is found, use the generic adapter
        console.log('Using generic form adapter');
        return {
            detectFields: function() {
                const formDetector = window.FormDetector || FormDetector;
                return formDetector.detectFields();
            },

            handleCommonQuestions: function() {
                // Generic handling of common questions
                AdapterFactory.handleVeteranStatusQuestions();
                AdapterFactory.handleDiversityQuestions();
            }
        };
    }

    /**
     * Check if the current page is a SmartRecruiters form
     * @returns {boolean} - Whether it's a SmartRecruiters form
     */
    static isSmartRecruitersForm() {
        return (
            window.location.hostname.includes('smartrecruiters.com') ||
            document.querySelector('div.careers-application-container') !== null ||
            document.querySelector('form[data-automation-id="application-form"]') !== null
        );
    }

    /**
     * Get adapter for SmartRecruiters
     * Note: This is a placeholder for a full implementation
     * @returns {Object} - SmartRecruiters adapter
     */
    static getSmartRecruitersAdapter() {
        return {
            detectFields: function() {
                const formDetector = window.FormDetector || FormDetector;
                return formDetector.detectFields();
            },

            handleCommonQuestions: function() {
                // Generic handling for now
                AdapterFactory.handleVeteranStatusQuestions();
                AdapterFactory.handleDiversityQuestions();
            }
        };
    }

    /**
     * Check if the current page is a BambooHR form
     * @returns {boolean} - Whether it's a BambooHR form
     */
    static isBambooHRForm() {
        return (
            window.location.hostname.includes('bamboohr.com') ||
            document.querySelector('div.BambooHR-ATS-Jobs-ViewController') !== null
        );
    }

    /**
     * Get adapter for BambooHR
     * Note: This is a placeholder for a full implementation
     * @returns {Object} - BambooHR adapter
     */
    static getBambooHRAdapter() {
        return {
            detectFields: function() {
                const formDetector = window.FormDetector || FormDetector;
                return formDetector.detectFields();
            },

            handleCommonQuestions: function() {
                // Generic handling for now
                AdapterFactory.handleVeteranStatusQuestions();
                AdapterFactory.handleDiversityQuestions();
            }
        };
    }

    /**
     * Check if the current page is a SuccessFactors form
     * @returns {boolean} - Whether it's a SuccessFactors form
     */
    static isSuccessFactorsForm() {
        return (
            window.location.hostname.includes('successfactors.com') ||
            window.location.hostname.includes('successfactors.eu') ||
            document.querySelector('div.recruiting-application') !== null
        );
    }

    /**
     * Get adapter for SuccessFactors
     * Note: This is a placeholder for a full implementation
     * @returns {Object} - SuccessFactors adapter
     */
    static getSuccessFactorsAdapter() {
        return {
            detectFields: function() {
                const formDetector = window.FormDetector || FormDetector;
                return formDetector.detectFields();
            },

            handleCommonQuestions: function() {
                // Generic handling for now
                AdapterFactory.handleVeteranStatusQuestions();
                AdapterFactory.handleDiversityQuestions();
            }
        };
    }

    /**
     * Handle veteran status questions (generic implementation)
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
     * Handle diversity/EEO questions (generic implementation)
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
            const selects = section.querySelectorAll('select');

            // Handle radio buttons
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

            // Handle select dropdowns
            selects.forEach(select => {
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
        });
    }
}

// Export the class if using modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdapterFactory;
}