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
let database, auth, storage;
try {
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase initialized successfully");
    
    database = firebase.database();
    auth = firebase.auth();
    storage = firebase.storage();
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
const mcqQuestionsContainer = document.getElementById('mcqQuestionsContainer');
const essayQuestionsContainer = document.getElementById('essayQuestionsContainer');
const mediumRadios = document.querySelectorAll('input[name="medium"]');

// Variables
let currentSection = 1;
const totalSections = 2;
let paperId = '';
let selectedMedium = '';
let closeTime = null;
let timerInterval = null;
let hasEssayQuestions = false;

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

// Get paper ID from URL
function getPaperIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('paperId');
    
    if (!id) {
        console.error("No paperId found in URL");
        alert('This paper link is invalid. Please check the URL and try again.');
        return null;
    }
    
    console.log("Retrieved paperId from URL:", id);
    return id;
}

// Load paper details
function loadPaperDetails() {
    paperId = getPaperIdFromUrl();
    if (!paperId) {
        alert('Invalid paper link');
        window.location.href = 'index.html';
        return;
    }

    database.ref('paperClassPapers/' + paperId).once('value').then(snapshot => {
        const paper = snapshot.val();
        if (!paper) {
            alert('Paper not found');
            window.location.href = 'index.html';
            return;
        }

        // Display paper header info
        document.getElementById('paperTitle').textContent = paper.title || 'Untitled Paper';
        document.getElementById('paperYear').textContent = paper.year || '----';
        document.getElementById('paperNumber').textContent = paper.paperNumber || '--';
        document.getElementById('paperSubject').textContent = paper.subject || 'Not specified';
        document.getElementById('paperMediums').textContent = paper.medium || 'Not specified';

        // Set up countdown timer if closeTime exists
        if (paper.closeTime) {
            closeTime = paper.closeTime;
            setupTimer(paper.closeTime);
        } else {
            document.getElementById('timerSection').style.display = 'none';
        }
    }).catch(error => {
        console.error('Error loading paper:', error);
        alert('Error loading paper. Please try again.');
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
            document.getElementById('timerSection').className = 'timer alert alert-danger';
            return;
        }
        
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        document.getElementById('timeRemaining').textContent = 
            `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        if (distance < 600000) { // 10 minutes remaining
            document.getElementById('timerSection').className = 'timer alert alert-danger';
        } else if (distance < 1800000) { // 30 minutes remaining
            document.getElementById('timerSection').className = 'timer alert alert-warning';
        }
    }, 1000);
}

// Load questions for answer section
function loadQuestions() {
    database.ref(`paperClassPapers/${paperId}/questions`).once('value').then(snapshot => {
        const questions = snapshot.val() || {};
        
        // Clear existing questions
        mcqQuestionsContainer.innerHTML = '';
        essayQuestionsContainer.innerHTML = '';
        
        let mcqCount = 0;
        let essayCount = 0;
        
        // Create rows for each question
        for (const [qNum, question] of Object.entries(questions)) {
            if (question.type === 'mcq') {
                mcqCount++;
                const row = document.createElement('tr');
                row.className = 'question-item';
                row.dataset.questionNumber = qNum;
                row.dataset.questionType = 'mcq';
                row.innerHTML = `
                    <td>${qNum}</td>
                    <td><input type="radio" class="answer-radio" name="q${qNum}" value="1" required></td>
                    <td><input type="radio" class="answer-radio" name="q${qNum}" value="2" required></td>
                    <td><input type="radio" class="answer-radio" name="q${qNum}" value="3" required></td>
                    <td><input type="radio" class="answer-radio" name="q${qNum}" value="4" required></td>
                    <td><input type="radio" class="answer-radio" name="q${qNum}" value="5" required></td>
                `;
                mcqQuestionsContainer.appendChild(row);
            } else if (question.type === 'essay') {
                essayCount++;
                hasEssayQuestions = true;
                const questionDiv = document.createElement('div');
                questionDiv.className = 'essay-question mb-4 p-3 border rounded';
                questionDiv.dataset.questionNumber = qNum;
                questionDiv.dataset.questionType = 'essay';
                questionDiv.innerHTML = `
                    <h6>Question ${qNum} (${question.marks} marks)</h6>
                    <div class="alert alert-info mb-3">
                        <i class="fas fa-info-circle me-2"></i> Please upload your answer as a PDF file
                    </div>
                    <div class="file-upload-container">
                        <input type="file" class="form-control essay-answer" id="essay-${qNum}" accept=".pdf" required>
                        <div class="form-text">Max file size: 5MB</div>
                    </div>
                `;
                essayQuestionsContainer.appendChild(questionDiv);
            }
        }
        
        // Update instructions based on question types
        const instructionsText = document.getElementById('instructionsText');
        if (mcqCount > 0 && essayCount > 0) {
            instructionsText.textContent = 'Please answer all questions. MCQ questions must be answered here. Essay questions require PDF upload.';
        } else if (mcqCount > 0) {
            instructionsText.textContent = 'Please answer all MCQ questions.';
        } else if (essayCount > 0) {
            instructionsText.textContent = 'Please upload PDF files for all essay questions.';
        }
        
        // Hide sections if no questions of that type
        if (mcqCount === 0) {
            document.getElementById('mcqSection').style.display = 'none';
        }
        if (essayCount === 0) {
            document.getElementById('essaySection').style.display = 'none';
        }
    }).catch(error => {
        console.error('Error loading questions:', error);
        alert('Error loading questions. Please try again.');
    });
}

// Check if user is verified and paid
// Check if user is verified and paid
async function checkUserVerification(nic) {
    try {
        console.log("Checking verification for NIC:", nic);
        
        // First try to find the user by NIC in the users collection
        const usersRef = database.ref('users');
        const snapshot = await usersRef.orderByChild('nic').equalTo(nic).once('value');
        
        if (!snapshot.exists()) {
            console.log("User not found with NIC:", nic);
            return { 
                verified: false, 
                paid: false, 
                message: "User not found in our system. Please register first." 
            };
        }
        
        // Get the first matching user (assuming NIC is unique)
        let userData = null;
        snapshot.forEach(childSnapshot => {
            userData = childSnapshot.val();
            return true; // Break after first match
        });
        
        if (!userData) {
            console.error("Unexpected error: User data not found");
            return { 
                verified: false, 
                paid: false, 
                message: "Database error. Please try again." 
            };
        }
        
        console.log("Found user data:", userData);
        
        // Check verification status
        if (!userData.verified) {
            return { 
                verified: false, 
                paid: userData.isPaid || false, 
                message: "Your account is not verified. Please contact support." 
            };
        }
        
        // Check payment status
        if (!userData.isPaid) {
            return { 
                verified: true, 
                paid: false, 
                message: "Your account is not paid. Please complete payment to submit papers." 
            };
        }
        
        // User is verified and paid
        return { verified: true, paid: true, message: "" };
        
    } catch (error) {
        console.error('Error checking user verification:', error);
        return { 
            verified: false, 
            paid: false, 
            message: "Error verifying your account. Please try again." 
        };
    }
}

// Check for existing submission
async function checkExistingSubmission(paperId, nic) {
    try {
        const submissionSnapshot = await database.ref(`paperClassSubmissions/${paperId}/${nic}`).once('value');
        return submissionSnapshot.exists();
    } catch (error) {
        console.error('Error checking existing submission:', error);
        return false;
    }
}

// Handle form submission
async function handleSubmit() {
    // Get personal info
    const nic = document.getElementById('nic').value.trim();
    const name = document.getElementById('name').value.trim();
    const district = document.getElementById('district').value;
    const studentClass = document.getElementById('class').value;
    const school = document.getElementById('school').value.trim();
    const phone = document.getElementById('phone').value.trim();
    
    // Verify user before proceeding
    const verification = await checkUserVerification(nic);
    if (!verification.verified || !verification.paid) {
        showVerificationError(verification.message);
        return;
    }
    
    // Check for existing submission
    const alreadySubmitted = await checkExistingSubmission(paperId, nic);
    if (alreadySubmitted) {
        showVerificationError("You have already submitted this paper. Multiple submissions are not allowed.");
        return;
    }
    
    // Validate all required questions are answered
    if (!validateAnswers()) {
        alert('Please complete all required questions before submitting.');
        return;
    }
    
    // Disable submit button to prevent duplicate submissions
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Submitting...';
    
    try {
        // Get all answers
        const mcqAnswers = {};
        const essayFiles = [];
        
        // Process MCQ answers
        document.querySelectorAll('.question-item[data-question-type="mcq"]').forEach(row => {
            const qNum = row.dataset.questionNumber;
            const selectedAnswer = row.querySelector('input[type="radio"]:checked');
            if (selectedAnswer) {
                mcqAnswers[qNum] = selectedAnswer.value;
            }
        });
        
        // Process essay answers (upload files)
const essayUploadPromises = [];
const essayAnswers = {};

document.querySelectorAll('.essay-question').forEach(div => {
    const qNum = div.dataset.questionNumber;
    const fileInput = div.querySelector('input[type="file"]');
    
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        essayFiles.push(file);
        
        const filename = `essay-${paperId}-${nic}-${qNum}-${Date.now()}.pdf`;
        const storageRef = storage.ref(`paperClassSubmissions/${paperId}/${nic}/${filename}`);
        
        // Add upload promise with error handling
        const uploadPromise = storageRef.put(file)
            .then(snapshot => {
                return snapshot.ref.getDownloadURL();
            })
            .catch(error => {
                console.error(`Error uploading essay for question ${qNum}:`, error);
                throw new Error(`Failed to upload essay for question ${qNum}`);
            });
        
        essayUploadPromises.push(uploadPromise);
        essayAnswers[qNum] = {
            promiseIndex: essayUploadPromises.length - 1,
            filename: filename
        };
    }
});
        
        // Wait for all file uploads to complete
        const uploadUrls = await Promise.all(essayUploadPromises);
        
        // Prepare essay answers with URLs
        const finalEssayAnswers = {};
        for (const [qNum, essayInfo] of Object.entries(essayAnswers)) {
            finalEssayAnswers[qNum] = {
                url: uploadUrls[essayInfo.promiseIndex],
                filename: essayInfo.filename
            };
        }
        
        // Calculate MCQ score
        const { score, totalMcqMarks } = await calculateMcqScore(mcqAnswers);
        
        // Prepare submission data
        const submission = {
            name,
            nic,
            district,
            class: studentClass,
            school: school || '',
            phone: phone || '',
            medium: selectedMedium,
            mcqAnswers,
            mcqScore: score,
            totalMcqMarks,
            essayAnswers: hasEssayQuestions ? finalEssayAnswers : null,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            verified: true,
            paid: true
        };
        
        // Submit data to database
        await database.ref(`paperClassSubmissions/${paperId}/${nic}`).set(submission);
        
        // Show success section
        showSuccessSection(score, totalMcqMarks);
        
    } catch (error) {
        console.error('Submission error:', error);
        alert(`Error: ${error.message}`);
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane me-2"></i> Submit Answers';
    }
}

// Calculate MCQ score
async function calculateMcqScore(mcqAnswers) {
    const questionsSnapshot = await database.ref(`paperClassPapers/${paperId}/questions`).once('value');
    const questions = questionsSnapshot.val() || {};
    
    let score = 0;
    let totalMcqMarks = 0;
    
    for (const [qNum, answer] of Object.entries(mcqAnswers)) {
        const question = questions[qNum];
        if (question && question.type === 'mcq' && answer === question.answer) {
            score += question.marks || 0;
        }
        if (question && question.type === 'mcq') {
            totalMcqMarks += question.marks || 0;
        }
    }
    
    return { score, totalMcqMarks };
}

// Validate all required answers
function validateAnswers() {
    // Validate MCQ answers
    const mcqQuestions = document.querySelectorAll('.question-item[data-question-type="mcq"]');
    for (const row of mcqQuestions) {
        const qNum = row.dataset.questionNumber;
        const isAnswered = row.querySelector('input[type="radio"]:checked') !== null;
        if (!isAnswered) {
            alert(`Please answer MCQ question ${qNum}`);
            return false;
        }
    }
    
    // Validate essay answers
    const essayQuestions = document.querySelectorAll('.essay-question');
    for (const div of essayQuestions) {
        const qNum = div.dataset.questionNumber;
        const fileInput = div.querySelector('input[type="file"]');
        if (fileInput.files.length === 0) {
            alert(`Please upload PDF for essay question ${qNum}`);
            return false;
        }
        
        // Check file size (max 5MB)
        if (fileInput.files[0].size > 5 * 1024 * 1024) {
            alert(`File for question ${qNum} is too large. Max size is 5MB.`);
            return false;
        }
    }
    
    return true;
}

// Show verification error
function showVerificationError(message) {
    document.getElementById('verificationErrorText').textContent = message;
    showSection('sectionVerificationError');
    updateProgress(100);
    prevBtn.style.display = 'none';
    nextBtn.style.display = 'none';
    submitBtn.style.display = 'none';
}

// Show success section
function showSuccessSection(score, totalPossible) {
    document.getElementById('sectionSuccess').innerHTML = `
        <div class="card">
            <div class="card-body text-center py-5">
                <div class="success-icon mb-4">
                    <i class="fas fa-check-circle"></i>
                </div>
                <h2 class="mb-3">Answers Submitted Successfully!</h2>
                ${totalPossible > 0 ? `
                <p class="text-muted mb-3">Your MCQ score: ${score} out of ${totalPossible} points.</p>
                <div class="d-flex justify-content-center mb-4">
                    <div class="progress" style="height: 20px; width: 80%;">
                        <div class="progress-bar bg-success" role="progressbar" 
                             style="width: ${(score/totalPossible)*100}%" 
                             aria-valuenow="${(score/totalPossible)*100}" 
                             aria-valuemin="0" aria-valuemax="100">
                            ${Math.round((score/totalPossible)*100)}%
                        </div>
                    </div>
                </div>
                ` : ''}
                <p class="text-muted mb-4">Thank you for completing the paper. Your answers have been recorded.</p>
            </div>
        </div>
    `;
    
    showSection('sectionSuccess');
    updateProgress(100);
    prevBtn.style.display = 'none';
    nextBtn.style.display = 'none';
    submitBtn.style.display = 'none';
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
    
    // Validation for current section
    if (currentSection === 1 && !personalInfoForm.checkValidity()) {
        personalInfoForm.reportValidity();
        return;
    }
    
    // Load questions if moving to section 2 (Submit Answers)
    if (currentSection === 1) {
        const medium = document.querySelector('input[name="medium"]:checked');
        if (!medium) {
            alert('Please select a medium first');
            return;
        }
        selectedMedium = medium.value;
        loadQuestions();
    }
    
    currentSection++;
    showSection(`section${currentSection}`);
    updateProgress((currentSection / totalSections) * 100);
}

function prevSection() {
    if (currentSection <= 1) return;
    
    currentSection--;
    showSection(`section${currentSection}`);
    updateProgress((currentSection / totalSections) * 100);
}

// Check if user is registered and auto-fill info
async function checkRegisteredUser() {
    const nic = localStorage.getItem('userNIC');
    if (nic) {
        const usersRef = database.ref('users');
        const snapshot = await usersRef.orderByChild('nic').equalTo(nic).once('value');
        
        if (snapshot.exists()) {
            let userData = null;
            snapshot.forEach(childSnapshot => {
                userData = childSnapshot.val();
                return true; // Break after first match
            });
            
            if (userData) {
                document.getElementById('nic').value = nic;
                document.getElementById('name').value = userData.name || '';
                document.getElementById('district').value = userData.district || '';
                document.getElementById('class').value = userData.class || '';
                document.getElementById('school').value = userData.school || '';
                document.getElementById('phone').value = userData.phone || '';
            }
        }
    }
}

// Initialize page
function initializePage() {
    checkTheme();
    checkRegisteredUser();
    loadPaperDetails();
    updateProgress(50); // Initial progress for first section
    prevBtn.disabled = true;

    // Initialize buttons
    updateButtonVisibility();
    
    // Get paperId first
    paperId = getPaperIdFromUrl();
    if (!paperId) {
        // Show error but don't redirect (let the user see the error)
        return;
    }

    console.log("Initialization complete");
}

// Event Listeners
function setupEventListeners() {
    // Theme toggle
    themeToggle.addEventListener('click', toggleTheme);
    
    // Navigation buttons
    nextBtn.addEventListener('click', nextSection);
    prevBtn.addEventListener('click', prevSection);
    
    // Submit button
    submitBtn.addEventListener('click', handleSubmit);
    
    // Back to info button from verification error
    document.getElementById('backToInfoBtn')?.addEventListener('click', () => {
        currentSection = 1;
        showSection('section1');
        updateProgress(50);
        updateButtonVisibility();
    });
    
    // Medium selection radios
    mediumRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            selectedMedium = this.value;
        });
    });
    
    // Prevent form submission on enter key
    personalInfoForm.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
        }
    });
}

// Form validation feedback
function setupFormValidation() {
    personalInfoForm.addEventListener('submit', function(e) {
        e.preventDefault();
        nextSection();
    });
    
    // Add validation feedback
    const formInputs = personalInfoForm.querySelectorAll('input, select');
    formInputs.forEach(input => {
        input.addEventListener('invalid', function() {
            this.classList.add('is-invalid');
        });
        
        input.addEventListener('input', function() {
            if (this.checkValidity()) {
                this.classList.remove('is-invalid');
            }
        });
    });
}

// Initialize file upload validation
function setupFileUploadValidation() {
    document.addEventListener('change', function(e) {
        if (e.target.classList.contains('essay-answer')) {
            const fileInput = e.target;
            const file = fileInput.files[0];
            
            if (file) {
                // Clear previous validation
                fileInput.classList.remove('is-invalid', 'is-valid');
                
                // Check file size (5MB limit)
                if (file.size > 5 * 1024 * 1024) {
                    fileInput.classList.add('is-invalid');
                    alert('File size exceeds 5MB limit. Please choose a smaller file.');
                    fileInput.value = '';
                    return;
                }
                
                // Check file type
                if (file.type !== 'application/pdf') {
                    fileInput.classList.add('is-invalid');
                    alert('Only PDF files are accepted.');
                    fileInput.value = '';
                    return;
                }
                
                // If all checks pass
                fileInput.classList.add('is-valid');
            }
        }
    });
}

// Main initialization
document.addEventListener('DOMContentLoaded', function() {
    initializePage();
    setupEventListeners();
    setupFormValidation();
    setupFileUploadValidation();
    
    // Show first section
    showSection('section1');
});
