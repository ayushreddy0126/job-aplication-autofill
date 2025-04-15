/**
 * Resume Parser Module
 *
 * This module handles extracting structured data from resume text.
 * In a production implementation, you'd want to use more advanced techniques,
 * such as natural language processing and machine learning.
 */

class ResumeParser {
    /**
     * Parse a resume from text
     * @param {string} text - The plain text content of the resume
     * @returns {object} - Structured resume data
     */
    static parse(text) {
        try {
            // Extract basic sections
            const sections = this.extractSections(text);

            // Parse personal information
            const personalInfo = this.parsePersonalInfo(text, sections.header);

            // Parse experience
            const experience = this.parseExperience(sections.experience);

            // Parse education
            const education = this.parseEducation(sections.education);

            // Parse skills
            const skills = this.parseSkills(sections.skills);

            return {
                personalInfo,
                experience,
                education,
                skills,
                rawText: text
            };
        } catch (error) {
            console.error('Error parsing resume:', error);
            throw error;
        }
    }

    /**
     * Extract sections from resume text
     * @param {string} text - Resume text
     * @returns {object} - Sections of the resume
     */
    static extractSections(text) {
        // Normalize line endings and clean up text
        const normalizedText = text
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/\n+/g, '\n')
            .trim();

        // Common section headers
        const sectionHeaders = {
            experience: ['experience', 'work experience', 'employment', 'work history', 'professional experience'],
            education: ['education', 'educational background', 'academic background', 'academic experience', 'academic history'],
            skills: ['skills', 'technical skills', 'core competencies', 'competencies', 'expertise', 'proficiencies'],
            projects: ['projects', 'personal projects', 'professional projects'],
            certifications: ['certifications', 'certificates', 'licenses'],
            languages: ['languages', 'language proficiencies'],
            summary: ['summary', 'professional summary', 'career summary', 'career objective', 'objective']
        };

        // Split text into lines
        const lines = normalizedText.split('\n');

        // Find section boundaries
        const sectionBoundaries = this.findSectionBoundaries(lines, sectionHeaders);

        // Extract text for each section
        const sections = {};

        // Extract header (everything before the first section)
        sections.header = lines.slice(0, sectionBoundaries[0]?.index || lines.length).join('\n');

        // Extract remaining sections
        for (let i = 0; i < sectionBoundaries.length; i++) {
            const currentSection = sectionBoundaries[i];
            const nextSection = sectionBoundaries[i + 1];

            const startIndex = currentSection.index + 1; // Skip the header line
            const endIndex = nextSection ? nextSection.index : lines.length;

            sections[currentSection.type] = lines.slice(startIndex, endIndex).join('\n');
        }

        return sections;
    }

    /**
     * Find section boundaries in the resume
     * @param {string[]} lines - Lines of text
     * @param {object} sectionHeaders - Dictionary of section headers
     * @returns {array} - Array of section boundary objects
     */
    static findSectionBoundaries(lines, sectionHeaders) {
        const boundaries = [];

        lines.forEach((line, index) => {
            const cleanLine = line.trim().toLowerCase();

            // Skip empty lines
            if (!cleanLine) return;

            // Check if this line is a section header
            for (const [sectionType, headers] of Object.entries(sectionHeaders)) {
                if (headers.some(header => {
                    // Check for exact match or header with colon
                    return cleanLine === header || cleanLine === `${header}:`;
                })) {
                    boundaries.push({
                        type: sectionType,
                        index
                    });
                    break;
                }
            }
        });

        // Sort boundaries by index
        return boundaries.sort((a, b) => a.index - b.index);
    }

    /**
     * Helper method to extract a pattern from text
     * @param {string} text - Text to search in
     * @param {RegExp} pattern - Regex pattern to match
     * @returns {string} - Extracted text or empty string
     */
    static extractPattern(text, pattern) {
        const match = text.match(pattern);
        return match ? match[0] : '';
    }

    /**
     * Parse personal information from resume
     * @param {string} fullText - Full resume text
     * @param {string} headerText - Header section text
     * @returns {object} - Personal information
     */
    static parsePersonalInfo(fullText, headerText) {
        // Common patterns for personal information
        const patterns = {
            email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
            phone: /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/,
            linkedin: /linkedin\.com\/in\/[a-zA-Z0-9-]+/,
            website: /https?:\/\/(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+(\/[a-zA-Z0-9-._~:/?#[\]@!$&'()*+,;=]*)?/,
            address: /\d+\s+[A-Za-z\s,]+\d{5}/
        };

        // Extract information using regex patterns
        const email = this.extractPattern(fullText, patterns.email);
        const phone = this.extractPattern(fullText, patterns.phone);
        const linkedin = this.extractPattern(fullText, patterns.linkedin);
        const website = this.extractPattern(fullText, patterns.website);
        const address = this.extractPattern(fullText, patterns.address);

        // Extract name (assume it's at the top)
        const lines = headerText.trim().split('\n');
        const fullName = lines[0] || '';

        return {
            fullName,
            email,
            phone,
            linkedin,
            website,
            address
        };
    }

    /**
     * Parse experience section
     * @param {string} text - Experience section text
     * @returns {array} - Array of job experiences
     */
    static parseExperience(text) {
        if (!text) return [];

        // In a real implementation, you'd use more sophisticated parsing
        // Here's a simplified approach that looks for patterns

        // Split by potential job entries (this is simplified)
        const experiences = [];

        // Split the experience section into potential job blocks
        // This assumes jobs are separated by blank lines or clear employer/title lines
        const jobBlocks = text.split(/\n\s*\n/);

        jobBlocks.forEach(block => {
            if (!block.trim()) return;

            // Try to extract components of a job
            const lines = block.trim().split('\n');

            // Common patterns for job information
            const titleCompanyPattern = /^(.*?)\s*(?:at|,|\|)\s*(.*?)$/i;
            const datePattern = /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4})\s*(?:-|to|–|—)\s*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|Present|Current)/i;

            let title = '';
            let company = '';
            let startDate = '';
            let endDate = '';
            let description = '';

            // First line might have title and company
            const firstLine = lines[0];
            const titleCompanyMatch = firstLine.match(titleCompanyPattern);

            if (titleCompanyMatch) {
                title = titleCompanyMatch[1].trim();
                company = titleCompanyMatch[2].trim();
            } else {
                // Assume it's just a company or title
                title = firstLine.trim();
            }

            // Second line might have dates
            if (lines.length > 1) {
                const secondLine = lines[1];
                const dateMatch = secondLine.match(datePattern);

                if (dateMatch) {
                    startDate = dateMatch[1];
                    endDate = dateMatch[2];
                }
            }

            // Remaining lines are description
            const descriptionLines = lines.slice(
                (titleCompanyMatch ? 1 : 0) + (startDate ? 1 : 0)
            );

            description = descriptionLines.join('\n').trim();

            experiences.push({
                title,
                company,
                startDate,
                endDate,
                description
            });
        });

        return experiences;
    }

    /**
     * Parse education section
     * @param {string} text - Education section text
     * @returns {array} - Array of education entries
     */
    static parseEducation(text) {
        if (!text) return [];

        const education = [];

        // Split by potential education entries
        const educationBlocks = text.split(/\n\s*\n/);

        educationBlocks.forEach(block => {
            if (!block.trim()) return;

            // Try to extract components of education
            const lines = block.trim().split('\n');

            // Common patterns for education information
            const degreeSchoolPattern = /^(.*?)\s*(?:at|,|\||\s+from)\s*(.*?)$/i;
            const datePattern = /(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+)?\d{4}\s*(?:-|to|–|—)\s*(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+)?\d{4}|Present|Current/i;
            const yearPattern = /\b(20\d{2}|19\d{2})\b/g;

            let degree = '';
            let school = '';
            let startDate = '';
            let endDate = '';
            let description = '';

            // First line might have degree and school
            const firstLine = lines[0];
            const degreeSchoolMatch = firstLine.match(degreeSchoolPattern);

            if (degreeSchoolMatch) {
                degree = degreeSchoolMatch[1].trim();
                school = degreeSchoolMatch[2].trim();
            } else {
                // Try to determine if it's a degree or school name
                const potentialDegrees = ['bachelor', 'master', 'bs', 'ba', 'ms', 'ma', 'phd', 'doctorate'];
                if (potentialDegrees.some(d => firstLine.toLowerCase().includes(d))) {
                    degree = firstLine;
                } else {
                    school = firstLine;
                }
            }

            // Look for dates in any line
            const allText = lines.join(' ');
            const dateMatch = allText.match(datePattern);

            if (dateMatch) {
                // Extract the full date range
                const dateRange = dateMatch[0];
                const years = dateRange.match(yearPattern);

                if (years && years.length >= 1) {
                    startDate = years[0];
                    endDate = years.length >= 2 ? years[1] : 'Present';
                }
            }

            // Any remaining lines are description
            const descriptionLines = lines.slice(1);
            description = descriptionLines.join('\n').trim();

            education.push({
                degree,
                school,
                startDate,
                endDate,
                description
            });
        });

        return education;
    }

    /**
     * Parse skills section
     * @param {string} text - Skills section text
     * @returns {array} - Array of skills
     */
    static parseSkills(text) {
        if (!text) return [];

        // Try multiple approaches to extract skills

        // First, try to split by common delimiters
        let skills = text.split(/[,•|•·*+\n]+/)
            .map(skill => skill.trim())
            .filter(skill => skill.length > 0);

        // If too few skills found, try splitting by space
        // (only if the average word count is high, indicating phrases)
        if (skills.length < 3) {
            const words = text.split(/\s+/);
            if (words.length > 10) {
                skills = words
                    .filter(word => word.length > 2)
                    .map(word => word.trim().replace(/[,.;:]/g, ''));
            }
        }

        return skills;
    }
}

// Export the class if using modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ResumeParser;
}