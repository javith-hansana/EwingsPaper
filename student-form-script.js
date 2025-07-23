// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyD5SRZWB-QwMg7wmyTjcvHZqP-mEdlll_M",
    authDomain: "paper-class-1ab19.firebaseapp.com",
    databaseURL: "https://paper-class-1ab19-default-rtdb.firebaseio.com",
    projectId: "paper-class-1ab19",
    storageBucket: "paper-class-1ab19.appspot.com",
    messagingSenderId: "83634677566",
    appId: "1:83634677566:web:fb4f7a1fd869c3e82e2e6f"
};

// Initialize Firebase
let database, auth;
try {
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase initialized successfully");
    
    database = firebase.database();
    auth = firebase.auth();
    
    // Test database connection
    database.ref('.info/connected').on('value', (snapshot) => {
        if (snapshot.val() === true) {
            console.log("Connected to Firebase database");
        } else {
            console.log("Not connected to Firebase database");
        }
    });
} catch (error) {
    console.error("Firebase initialization error:", error);
}

// DOM elements
const themeToggle = document.getElementById('themeToggle');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const submitBtn = document.getElementById('submitBtn');
const progressBar = document.querySelector('.progress-bar');
const steps = document.querySelectorAll('.step');
const sections = document.querySelectorAll('.section');
const personalInfoForm = document.getElementById('personalInfoForm');
const formQuestionsContainer = document.getElementById('formQuestionsContainer');
const formTitleHeader = document.getElementById('formTitleHeader');
const formDescriptionText = document.getElementById('formDescriptionText');
const timerSection = document.getElementById('timerSection');
const backToHomeBtn = document.getElementById('backToHomeBtn');
const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
const loginSubmitBtn = document.getElementById('loginSubmitBtn');
const loginForm = document.getElementById('loginForm');

// Variables
let currentSection = 1;
const totalSections = 2;
let formId = '';
let formData = null;
let closeTime = null;
let timerInterval = null;
let requireLogin = false;
let isStudentOnly = false;

// Theme toggle functionality
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const icon = themeToggle.querySelector('i');
    if (document.body.classList.contains('dark-mode')) {
        icon.classList.replace('fa-moon', 'fa-sun');
        localStorage.setItem('theme', 'dark');
    } else {
        icon.classList.replace('fa-sun', 'fa-moon');
        localStorage.setItem('theme', 'light');
    }
}

// Check for saved theme preference
function checkTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        const icon = themeToggle.querySelector('i');
        icon.classList.replace('fa-moon', 'fa-sun');
    }
}

// Get form ID from URL
function getFormIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('formId');
    
    if (!id) {
        console.error("No formId found in URL");
        alert('This form link is invalid. Please check the URL and try again.');
        return null;
    }
    
    console.log("Retrieved formId from URL:", id);
    return id;
}

// Load form details
function loadFormDetails() {
    formId = getFormIdFromUrl();
    if (!formId) {
        alert('Invalid form link');
        window.location.href = 'index.html';
        return;
    }

    database.ref('generalForms/' + formId).once('value').then(snapshot => {
        const form = snapshot.val();
        if (!form) {
            alert('Form not found');
            window.location.href = 'index.html';
            return;
        }

        // Store form data
        formData = form;
        requireLogin = form.requireLogin || false;
        isStudentOnly = form.access === 'students';

        // Display form header info
        formTitleHeader.textContent = form.title || 'Untitled Form';
        formDescriptionText.textContent = form.description || 'Complete all sections to submit your responses';

        // Set up countdown timer if closeTime exists
        if (form.closeTime) {
            closeTime = form.closeTime;
            setupTimer(form.closeTime);
        } else {
            timerSection.style.display = 'none';
        }

        // Load questions if we're already on section 2 (direct link)
        if (currentSection === 2) {
            loadFormQuestions();
        }
    }).catch(error => {
        console.error('Error loading form:', error);
        alert('Error loading form. Please try again.');
    });
}

// Set up countdown timer
function setupTimer(closeTime) {
    const countDownDate = new Date(closeTime).getTime();
    
    // Clear any existing timer
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    timerInterval = setInterval(function() {
        const now = new Date().getTime();
        const distance = countDownDate - now;
        
        if (distance < 0) {
            clearInterval(timerInterval);
            document.getElementById('timeRemaining').textContent = "TIME EXPIRED";
            submitBtn.disabled = true;
            timerSection.className = 'timer alert alert-danger';
            return;
        }
        
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        document.getElementById('timeRemaining').textContent = 
            `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        if (distance < 600000) { // 10 minutes remaining
            timerSection.className = 'timer alert alert-danger';
        } else if (distance < 1800000) { // 30 minutes remaining
            timerSection.className = 'timer alert alert-warning';
        }
    }, 1000);
}

// Load form questions
function loadFormQuestions() {
    if (!formData || !formData.questions) {
        console.error('No form questions data available');
        return;
    }

    // Clear existing questions
    formQuestionsContainer.innerHTML = '';
    
    // Create elements for each question
    formData.questions.forEach((question, index) => {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'mb-4 question-item';
        questionDiv.dataset.questionIndex = index;
        questionDiv.dataset.questionType = question.type;
        questionDiv.dataset.questionRequired = question.required;

        let questionHtml = `
            <div class="question-header mb-3">
                <h5>${index + 1}. ${question.title} ${question.required ? '<span class="text-danger">*</span>' : ''}</h5>
                ${question.description ? `<p class="text-muted">${question.description}</p>` : ''}
            </div>
        `;

        // Add input based on question type
        switch (question.type) {
            case 'short-answer':
                questionHtml += `
                    <input type="text" class="form-control" name="q${index}" 
                           ${question.required ? 'required' : ''} placeholder="Your answer">
                `;
                break;
                
            case 'paragraph':
                questionHtml += `
                    <textarea class="form-control" name="q${index}" rows="3" 
                              ${question.required ? 'required' : ''} placeholder="Your answer"></textarea>
                `;
                break;
                
            case 'multiple-choice':
                questionHtml += `<div class="options-container">`;
                question.options.forEach((option, optIndex) => {
                    questionHtml += `
                        <div class="form-check mb-2">
                            <input class="form-check-input" type="radio" name="q${index}" 
                                   id="q${index}o${optIndex}" value="${option}" 
                                   ${question.required ? 'required' : ''}>
                            <label class="form-check-label" for="q${index}o${optIndex}">${option}</label>
                        </div>
                    `;
                });
                if (question.includeOther) {
                    questionHtml += `
                        <div class="form-check mb-2">
                            <input class="form-check-input" type="radio" name="q${index}" 
                                   id="q${index}other" value="other" ${question.required ? 'required' : ''}>
                            <label class="form-check-label" for="q${index}other">Other:</label>
                            <input type="text" class="form-control mt-1 other-input" 
                                   name="q${index}other" disabled>
                        </div>
                    `;
                }
                questionHtml += `</div>`;
                break;
                
            case 'checkbox':
                questionHtml += `<div class="options-container">`;
                question.options.forEach((option, optIndex) => {
                    questionHtml += `
                        <div class="form-check mb-2">
                            <input class="form-check-input" type="checkbox" name="q${index}[]" 
                                   id="q${index}o${optIndex}" value="${option}">
                            <label class="form-check-label" for="q${index}o${optIndex}">${option}</label>
                        </div>
                    `;
                });
                if (question.includeOther) {
                    questionHtml += `
                        <div class="form-check mb-2">
                            <input class="form-check-input" type="checkbox" name="q${index}[]" 
                                   id="q${index}other" value="other">
                            <label class="form-check-label" for="q${index}other">Other:</label>
                            <input type="text" class="form-control mt-1 other-input" 
                                   name="q${index}other" disabled>
                        </div>
                    `;
                }
                questionHtml += `</div>`;
                break;
                
            case 'dropdown':
                questionHtml += `
                    <select class="form-select" name="q${index}" ${question.required ? 'required' : ''}>
                        <option value="" selected disabled>Select an option</option>
                        ${question.options.map(option => `<option value="${option}">${option}</option>`).join('')}
                    </select>
                `;
                break;
                
            case 'linear-scale':
                const minLabel = question.minLabel || question.minValue;
                const maxLabel = question.maxLabel || question.maxValue;
                questionHtml += `
                    <div class="linear-scale-container">
                        <div class="d-flex justify-content-between mb-2">
                            <span>${minLabel}</span>
                            <span>${maxLabel}</span>
                        </div>
                        <input type="range" class="form-range" name="q${index}" 
                               min="${question.minValue}" max="${question.maxValue}" 
                               ${question.required ? 'required' : ''}>
                    </div>
                `;
                break;
                
            case 'rating':
                questionHtml += `
                    <div class="rating-container">
                        ${question.scale === 'stars' ? 
                            Array(5).fill().map((_, i) => 
                                `<i class="fas fa-star rating-star" data-value="${i+1}"></i>`).join('') :
                          question.scale === 'smileys' ?
                            Array(5).fill().map((_, i) => 
                                `<i class="fas fa-smile rating-smiley" data-value="${i+1}"></i>`).join('') :
                          Array(parseInt(question.scale) || 5).fill().map((_, i) => 
                                `<span class="badge bg-primary rating-number" data-value="${i+1}">${i+1}</span>`).join('')}
                        <input type="hidden" name="q${index}" ${question.required ? 'required' : ''}>
                    </div>
                `;
                break;
                
            case 'date':
                questionHtml += `
                    <input type="date" class="form-control" name="q${index}" 
                           ${question.required ? 'required' : ''}>
                    ${question.includeTime ? 
                        `<input type="time" class="form-control mt-2" name="q${index}_time">` : ''}
                `;
                break;
                
            case 'time':
                questionHtml += `
                    <input type="time" class="form-control" name="q${index}" 
                           ${question.required ? 'required' : ''}>
                `;
                break;
                
            default:
                questionHtml += `
                    <input type="text" class="form-control" name="q${index}" 
                           ${question.required ? 'required' : ''} placeholder="Your answer">
                `;
        }

        questionDiv.innerHTML = questionHtml;
        formQuestionsContainer.appendChild(questionDiv);

        // Add event listeners for special inputs
        if (question.type === 'multiple-choice' || question.type === 'checkbox') {
            // Enable/disable other text input
            questionDiv.querySelectorAll(`input[name^="q${index}"]`).forEach(input => {
                input.addEventListener('change', function() {
                    if (this.value === 'other' && (this.checked || this.selected)) {
                        questionDiv.querySelector('.other-input').disabled = false;
                    } else if (this.name === `q${index}other` && !this.checked) {
                        questionDiv.querySelector('.other-input').disabled = true;
                        questionDiv.querySelector('.other-input').value = '';
                    }
                });
            });
        }

        if (question.type === 'rating') {
            // Rating input functionality
            const ratingInput = questionDiv.querySelector('input[type="hidden"]');
            const ratingItems = questionDiv.querySelectorAll('.rating-star, .rating-smiley, .rating-number');
            
            ratingItems.forEach(item => {
                item.addEventListener('click', function() {
                    const value = this.getAttribute('data-value');
                    ratingInput.value = value;
                    
                    // Update visual state
                    ratingItems.forEach(el => {
                        if (el.classList.contains('rating-star') || el.classList.contains('rating-smiley')) {
                            if (parseInt(el.getAttribute('data-value')) <= parseInt(value)) {
                                el.classList.add('active');
                            } else {
                                el.classList.remove('active');
                            }
                        } else if (el.classList.contains('rating-number')) {
                            if (el === this) {
                                el.classList.add('active');
                            } else {
                                el.classList.remove('active');
                            }
                        }
                    });
                });
            });
        }
    });
}

// Check if NIC exists in our system
function checkNICExists(nic) {
    return database.ref('users/' + nic).once('value').then(snapshot => {
        return snapshot.exists();
    });
}

// Check if this NIC has already submitted the form
function checkDuplicateSubmission(nic) {
    return database.ref(`formSubmissions/${formId}/${nic}`).once('value').then(snapshot => {
        return snapshot.exists();
    });
}

// Handle form submission
async function handleSubmit() {
    // Validate all required questions are answered
    const requiredQuestions = document.querySelectorAll('.question-item[data-question-required="true"]');
    let allRequiredAnswered = true;
    
    requiredQuestions.forEach(q => {
        const questionIndex = q.dataset.questionIndex;
        const questionType = q.dataset.questionType;
        let answered = false;
        
        if (questionType === 'checkbox') {
            // For checkboxes, at least one should be checked
            answered = q.querySelector('input[type="checkbox"]:checked') !== null;
        } else if (questionType === 'multiple-choice' || questionType === 'dropdown') {
            // For radio buttons and dropdowns
            answered = q.querySelector('input[type="radio"]:checked') !== null || 
                      (q.querySelector('select') && q.querySelector('select').value !== '');
        } else {
            // For text inputs, textareas, etc.
            answered = q.querySelector('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), textarea, select').value.trim() !== '';
        }
        
        if (!answered) {
            allRequiredAnswered = false;
            q.classList.add('unanswered');
            q.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            q.classList.remove('unanswered');
        }
    });
    
    if (!allRequiredAnswered) {
        alert('Please answer all required questions before submitting.');
        return;
    }

    // Get personal info
    const nic = document.getElementById('nic').value.trim();
    const name = document.getElementById('name').value.trim();
    const district = document.getElementById('district').value;
    const studentClass = document.getElementById('class').value;
    const school = document.getElementById('school').value.trim();
    const phone = document.getElementById('phone').value.trim();
    
    // For student-only forms, verify NIC exists in our system
    if (isStudentOnly) {
        try {
            const nicExists = await checkNICExists(nic);
            if (!nicExists) {
                alert('This form is only for registered students. Please check your NIC number or contact support.');
                return;
            }
            
            // Check for duplicate submission
            const alreadySubmitted = await checkDuplicateSubmission(nic);
            if (alreadySubmitted) {
                alert('You have already submitted this form. Only one submission per student is allowed.');
                return;
            }
        } catch (error) {
            console.error('Error checking NIC:', error);
            alert('Error verifying your information. Please try again.');
            return;
        }
    }
    
    // If login is required, show login modal
    if (requireLogin) {
        return new Promise((resolve) => {
            loginModal.show();
            
            // Handle login submission
            const loginHandler = async (e) => {
                e.preventDefault();
                
                const email = document.getElementById('loginEmail').value;
                const password = document.getElementById('loginPassword').value;
                const rememberMe = document.getElementById('rememberMe').checked;
                
                loginSubmitBtn.disabled = true;
                document.getElementById('loginBtnText').style.display = 'none';
                document.getElementById('loginSpinner').style.display = 'inline-block';
                
                try {
                    // Set persistence based on remember me
                    await auth.setPersistence(
                        rememberMe ? firebase.auth.Auth.Persistence.LOCAL : 
                                    firebase.auth.Auth.Persistence.SESSION
                    );
                    
                    // Sign in with email and password
                    await auth.signInWithEmailAndPassword(email, password);
                    
                    // Close modal and proceed with submission
                    loginModal.hide();
                    loginSubmitBtn.removeEventListener('click', loginHandler);
                    loginForm.removeEventListener('submit', loginHandler);
                    
                    // Continue with form submission
                    await completeFormSubmission(nic, name, district, studentClass, school, phone);
                    resolve(true);
                } catch (error) {
                    console.error('Login error:', error);
                    alert(`Login failed: ${error.message}`);
                    loginSubmitBtn.disabled = false;
                    document.getElementById('loginBtnText').style.display = 'inline-block';
                    document.getElementById('loginSpinner').style.display = 'none';
                    resolve(false);
                }
            };
            
            loginSubmitBtn.addEventListener('click', loginHandler);
            loginForm.addEventListener('submit', loginHandler);
            
            // Handle modal close
            loginModal._element.addEventListener('hidden.bs.modal', () => {
                loginSubmitBtn.removeEventListener('click', loginHandler);
                loginForm.removeEventListener('submit', loginHandler);
                resolve(false);
            }, { once: true });
        });
    } else {
        // No login required, proceed with submission
        return completeFormSubmission(nic, name, district, studentClass, school, phone);
    }
}

// Complete form submission after any required login
async function completeFormSubmission(nic, name, district, studentClass, school, phone) {
    // Disable submit button to prevent duplicate submissions
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Submitting...';
    
    // Get all responses
    const responses = {};
    document.querySelectorAll('.question-item').forEach(q => {
        const questionIndex = q.dataset.questionIndex;
        const questionType = q.dataset.questionType;
        
        if (questionType === 'checkbox') {
            // For checkboxes, get array of selected values
            const checked = Array.from(q.querySelectorAll('input[type="checkbox"]:checked'))
                .map(input => {
                    if (input.value === 'other') {
                        return q.querySelector('.other-input').value || 'Other';
                    }
                    return input.value;
                });
            responses[questionIndex] = checked;
        } else if (questionType === 'multiple-choice') {
            // For radio buttons, get selected value
            const selected = q.querySelector('input[type="radio"]:checked');
            if (selected) {
                responses[questionIndex] = selected.value === 'other' ? 
                    q.querySelector('.other-input').value || 'Other' : 
                    selected.value;
            }
        } else if (questionType === 'dropdown') {
            // For dropdowns, get selected value
            const select = q.querySelector('select');
            if (select && select.value) {
                responses[questionIndex] = select.value;
            }
        } else if (questionType === 'rating') {
            // For ratings, get the hidden input value
            const rating = q.querySelector('input[type="hidden"]').value;
            if (rating) {
                responses[questionIndex] = rating;
            }
        } else if (questionType === 'date' || questionType === 'time') {
            // For date/time inputs
            const inputs = q.querySelectorAll('input:not([type="hidden"])');
            if (inputs.length === 1) {
                responses[questionIndex] = inputs[0].value;
            } else if (inputs.length > 1) {
                // For date with time
                responses[questionIndex] = {
                    date: inputs[0].value,
                    time: inputs[1].value
                };
            }
        } else {
            // For text inputs, textareas, etc.
            const input = q.querySelector('input:not([type="hidden"]), textarea');
            if (input) {
                responses[questionIndex] = input.value;
            }
        }
    });
    
    // Prepare submission data
    const submission = {
        name,
        nic,
        district,
        class: studentClass,
        school: school || '',
        phone: phone || '',
        responses,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };
    
    // Submit data to database
    try {
        // Use NIC as the key if it's a student-only form, otherwise generate a random ID
        const submissionKey = isStudentOnly ? nic : database.ref().child('formSubmissions').push().key;
        
        await database.ref(`formSubmissions/${formId}/${submissionKey}`).set(submission);
        
        // Show success section
        showSection('sectionSuccess');
        updateProgress(100);
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
        submitBtn.style.display = 'none';
        
    } catch (error) {
        console.error('Submission error:', error);
        alert(`Error: ${error.message}`);
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane me-2"></i> Submit Form';
    }
}

// Update progress bar and steps
function updateProgress(percent) {
    progressBar.style.width = `${percent}%`;
    progressBar.setAttribute('aria-valuenow', percent);
    
    steps.forEach(step => {
        const stepNum = parseInt(step.dataset.step);
        if (stepNum < currentSection) {
            step.classList.add('completed');
            step.classList.remove('active');
        } else if (stepNum === currentSection) {
            step.classList.add('active');
            step.classList.remove('completed');
        } else {
            step.classList.remove('active', 'completed');
        }
    });
}

// Show specific section
function showSection(sectionId) {
    console.log(`Showing section: ${sectionId}`);
    sections.forEach(section => {
        if (section.id === sectionId) {
            section.classList.add('active');
            section.style.display = 'block';
        } else {
            section.classList.remove('active');
            section.style.display = 'none';
        }
    });
    
    // Update button visibility based on current section
    updateButtonVisibility();
}

function updateButtonVisibility() {
    console.log(`Updating buttons for section ${currentSection}`);
    
    // Always show prev button unless on first section
    prevBtn.style.display = currentSection === 1 ? 'none' : 'block';
    
    // Show next button except on last section
    nextBtn.style.display = currentSection >= totalSections ? 'none' : 'block';
    
    // Only show submit button on last section
    submitBtn.style.display = currentSection === totalSections ? 'block' : 'none';
    
    // Disable prev button on first section
    prevBtn.disabled = currentSection === 1;
}

// Navigate to next section
function nextSection() {
    if (currentSection >= totalSections) return;
    
    console.log(`Moving to next section from ${currentSection}`);
    
    // Validation for current section
    if (currentSection === 1 && !personalInfoForm.checkValidity()) {
        personalInfoForm.reportValidity();
        return;
    }
    
    // Load questions if moving to section 2 (Form Questions)
    if (currentSection === 1) {
        loadFormQuestions();
    }
    
    currentSection++;
    showSection(`section${currentSection}`);
    updateProgress((currentSection / totalSections) * 100);
}

function prevSection() {
    if (currentSection <= 1) return;
    
    console.log(`Moving to previous section from ${currentSection}`);
    
    currentSection--;
    showSection(`section${currentSection}`);
    updateProgress((currentSection / totalSections) * 100);
}

// Check if user is registered and auto-fill info
function checkRegisteredUser() {
    const nic = localStorage.getItem('userNIC');
    if (nic) {
        database.ref('users/' + nic).once('value').then(snapshot => {
            const user = snapshot.val();
            if (user) {
                document.getElementById('nic').value = nic;
                document.getElementById('name').value = user.name || '';
                document.getElementById('district').value = user.district || '';
                document.getElementById('class').value = user.class || '';
                document.getElementById('school').value = user.school || '';
                document.getElementById('phone').value = user.phone || '';
            }
        });
    }
}

// Initialize page
function initializePage() {
    checkTheme();
    checkRegisteredUser();
    loadFormDetails();
    updateProgress(50); // Initial progress for first section
    prevBtn.disabled = true;

    // Initialize buttons
    updateButtonVisibility();
    
    // Get formId first
    formId = getFormIdFromUrl();
    if (!formId) {
        // Show error but don't redirect (let the user see the error)
        return;
    }

    console.log("Initialization complete");
}

// Event listeners
themeToggle.addEventListener('click', toggleTheme);
prevBtn.addEventListener('click', prevSection);
nextBtn.addEventListener('click', nextSection);
submitBtn.addEventListener('click', handleSubmit);
backToHomeBtn?.addEventListener('click', () => {
    window.location.href = 'index.html';
});

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializePage);
