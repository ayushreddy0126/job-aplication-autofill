// Global Variables
let resumeData = null;
let autofillEnabled = true;
let highlightUncertain = true;

// Inititalize when the content script loads
(function() {
    console.log('JobFill content script loaded');

    //Check if we're on a job application page
    if(isJobApplicationPage()) {
        //Load resume data from storage
        chrome.storage.local.get(['resumeData', 'autofillEnabled', 'highlightUncertain'], function(data)
        {
            resumeData = data.resumeData;
            autofillEnabled = data.autofillEnabled !== false;
            highlightUncertain = data.highlightUncertain !== false;

            if(resumeData && autofillEnabled) {
                //Add a small delay to ensure the page is fully loaded
                setTimeout(() => {
                    detectAndFillForm();
                },1000);
            }
        });
        setupFormObserver();
    }
})();

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if(request.action === 'fillForm') {
        highlightUncertain = request.highlightUncertain;

        if(!resumeData) {
            chrome.storage.local.get('resumeData', function(data) {
                resumeData = data.resumeData;
                detectAndFillForm();
            });

        }else {
            detectAndFillForm();
        }
        sendResponse({ success : true});
    }
    return true;
});

// Check if the current page is a job application page
function isJobApplicationPage(){
    const url = window.location.href.toLowerCase();
    const title = document.title.toLowerCase();

    //Check URL patterns for common application systems
    const urlPatterns = [
        'workday.com',
        'lever.co',
        'greenhouse.io',
        'applytojob',
        'applicant',
        'careers',
        'jobs',
        'application',
        'apply'
    ];

    //check title patterns
    const titlePatterns = [
        'apply',
        'application',
        'job',
        'career',
        'employment'
    ];

    // Check form elements
    const hasApplicationFormElements =
        document.querySelectorAll('form input[type="text"]').length > 3 &&
        (document.querySelectorAll('input[type="email"]').length > 0 ||
            document.querySelectorAll('input[type="tel"]').length > 0);


    return (
        urlPatterns.some(pattern => url.inclued(pattern)) ||
            titlePatterns.some(pattern => title.includes(pattern)) ||
            hasApplicationFormElements
    );
}