document.addEventListener('DOMContentLoaded', function(){


    //Elements
    const resumeUploadInput = document.getElementById('resume-upload');
    const parseResumeButton = document.getElementById('parse-resume');
    const saveDataButton = document.getElementById('save-data');
    const resetDataButton = document.getElementById('reset-data');
    const fillCurrentPageButton = document.getElementById('fill-current-page');
    const autofillEnabledToggle = document.getElementById('autofill-enabled');
    const highlightUncertainToggle = document.getElementById('highlight-uncertain');


    const initialSetupSection = document.getElementById('initial-setup');
    const resumeDataSection = document.getElementById('resume-data');
    const autofillControlsSection =document.getElementById('autofill-controls');

    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    if (tabButtons.length > 0 && tabContents.length > 0) {
        tabButtons.forEach(button => {
            button.addEventListener('click', function() {
                const tabName = this.dataset.tab;

                // Update active tab button
                tabButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');

                // Show selected tab content
                tabContents.forEach(content => {
                    content.classList.add('hidden');
                    if (content.id === `${tabName}-tab`) {
                        content.classList.remove('hidden');
                    }
                });
            });
        });
    } else {
        console.error('Tab buttons or tab contents not found');
    }

    // Add this to the beginning of your popup.js
    window.addEventListener('error', function(event) {
        console.error('Error occurred:', event.error);
        alert('Error: ' + event.error.message);
        event.preventDefault();
    });

// Modify your file upload handling code with more error logging
    resumeUploadInput.addEventListener('change', function(e) {
        try {
            console.log('File selected:', e.target.files);
            if (e.target.files.length > 0) {
                resumeFile = e.target.files[0];
                console.log('File object:', resumeFile);
                parseResumeButton.disabled = false;

                // Show file name
                const label = resumeUploadInput.nextElementSibling;
                label.textContent = resumeFile.name;
            }
        } catch (error) {
            console.error('Error in file upload handler:', error);
        }
    });


    // Resume file handling

    let resumeFile = null;

    resumeUploadInput.addEventListener('change', function(e){
        if(e.target.files.length > 0) {
            resumeFile = e.target.files[0];
            parseResumeButton.disabled = false;

            // Show file name
            const label = resumeUploadInput.nextElementSibling;
            label.textContent = resumeFile.name;
        }
    });

    // Parse resume button
    parseResumeButton.addEventListener('click', function(){
        if(!resumeFile) return;

        // Show Loading state
        parseResumeButton.textContent = 'Parsing...';
        parseResumeButton.disabled = true;

        // Read file and send to background script for parsing
        const reader = new FileReader();
        reader.onload = function(e){
            const fileData = e.target.result;

            // Send to background script for parsing
            chrome.runtime.sendMessage(
                {
                    action : 'parseResume',
                    fileData,
                    fileName: resumeFile.name
                },

                function(response){
                    if(response && response.success) {
                        // populate the form with parsed data
                        populateFormWithResumeData(response.data);


                        //Show resume data and autofill sections
                        initialSetupSection.classList.add('hidden');
                        resumeDataSection.classList.remove('hidden');
                        autofillControlsSection.classList.remove('hidden');

                    } else {
                        //Show error
                        parseResumeButton.textContent = 'Error! Please Try Again';
                        parseResumeButton.disabled = false;
                        alert('Failed to parse resume: ' + (response?.error || 'Unknown error'));
                    }
                }
            );
        };
        reader.readAsArrayBuffer(resumeFile);
    });


    // Tab Switching
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabName = this.dataset.tab;

            //Update active tab button
            tabButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');


            //Show selected tab content
            tabcontents.forEach(content => {
                content.classList.add('hidden');
                if(content.id === `${tabName}-tab`){
                    content.classList.remove('hidden');
                }
            });
        });
    });

    //Save resume data
    saveDataButton.addEventListener('click', function() {
        const resumeData = collectFormData();

        // Save to chrome storage
        chrome.storage.local.set({ resumeData }, function(){
            const saveStatus = document.createElement('span');
            saveStatus.textContent = ' Saved!';
            saveStatus.style.color = '#4caf50';
        });
    });

    // Reset Data
    resetDataButton.addEventListener('click', function(){
        if(confirm('Are you sure you want to reset all data? An action that cannot be undone.')){
            chrome.storage.local.remove('resumeData', function(){
                initialSetupSection.classList.remove('hidden');
                resumeDataSection.classList.add('hidden');
                autofillControlsSection.classList.add('hidden');

                // Reset file input
                resumeUploadInput.value = '';
                resumeUploadInput.nextElementSibling.textContent = 'Choose file or drag here';
                parseResumeButton.textContent = 'Parse Resume';
                parseResumeButton.disabled = true;
            });
        }
    });

    // Fill current page
    fillCurrentPageButton.addEventListener('click', function (){
        chrome.tabs.query({
            active : true,
            currentWindow : true}, function(tabs){
            chrome.tabs.sendMessage(tabs[0].id,{
                action: 'fillForm',
                highlightUncertain : highlightUncertainToggle.checked
            });
        });
    });

    // Toggle autofill
    autofillEnabledToggle.addEventListener('change', function (){
        chrome.storage.local.set({ autofillEnabled: this.checked});
    });

    // Toggle highlight uncertain fields
    highlightUncertainToggle.addEventListener('change', function(){
        chrome.storage.local.set({
            highlightUncertain: this.checked
        });
    });

    // Load saved Settings
    chrome.storage.local.get(['resumeData', 'autofillEnabled','highlightUncertain'], function(data) {
        //Set toggle states
        autofillEnabledToggle.checked = data.autofillEnabled !== false;
        highlightUncertainToggle.checked = data.highlightUncertain !== false;


        // IF we have resume data, show the appropriate Sections
        if(data.resumeData) {
            populateFormWithResumeData(data.resumeData);
            initialSetupSection.classList.add('hidden');
            resumeDataSection.classList.remove('hidden');
            autofillControlsSection.classList.remove('hidden');
        }
    });

    // Helper functions
    function populateFormWithResumeData(data) {
        // Populate personal info
        if(data.personalInfo){
            document.getElementById('full-name').value = data.personalInfo.fullName || '';
            document.getElementById('email').value = data.personalInfo.email || '';
            document.getElementById('phone').value = data.personalInfo.phone || '';
            document.getElementById('address').value = data.personalInfo.address || '';
        }

        // Populate education
        if(data.education && data.education.length > 0){
            const educationList = document.getElementById('education-list');
            educationList.innerHTML = '';

            data.education.forEach((edu, index) => {
                addEducationItem(edu,index);
            });
        }

        // Populate Skills
        if(data.skills){
            document.getElementById('skills').value = Array.isArray(data.skills)
            ? data.skills.join(', ')
                : data.skills;
        }
    }

    function collectFormData(){
        //Collect personal info
        const personalInfo = {
            fullName : document.getElementById('full-name').value,
            email : document.getElementById('email').value,
            phone : document.getElementById('phone').value,
            address : document.getElementById('address').value
        };


        // TODO : Collect education, experience, and skills data
        // This would involve gathering data from dynamically generated form fields

        return {
            personalInfo,
            education: [],
            experience: [],
            skills: document.getElementById('skills').value.split(',').map(s => s.trim())
        };
    }


    function addEducationItem(education ={},index) {
        //TODO : Implement adding education item to the form
        console.log('Adding education item:', education, index);
    }

    function addExperienceItem(experience = {}, index) {
        //TODO: Implement adding experience item to the form
        console.log('Adding experience item:', experience, index);
    }

    //Implement drag and drop for resume upload
    const uploadArea = document.querySelector('.upload-area');

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e){
        e.preventDefault();
        e.stopPropogation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
       uploadArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, unhighlight, false);
    });

    function highlight(){
        uploadArea.classList.add('highlight');
    }

    function unhighlight(){
        uploadArea.classList.remove('highlight');
    }

    uploadArea.addEventListener('drop', handleDrop, false);

    function handleDrop(e){
        const dt = e.dataTransfer;
        const files = dt.files;

        if(files.length > 0){
            resumeFile = files[0];
            parseResumeButton.disabled = false;

            //Show file name
            const label = resumeUploadInput.nextElementSibling;
            label.textContent = resumeFile.name;
        }
    }
});