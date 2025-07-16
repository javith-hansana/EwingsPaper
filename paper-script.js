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
const viewResultsBtn = document.getElementById('viewResultsBtn');
const progressBar = document.querySelector('.progress-bar');
const steps = document.querySelectorAll('.step');
const sections = document.querySelectorAll('.section');
const personalInfoForm = document.getElementById('personalInfoForm');
const questionsContainer = document.getElementById('questionsContainer');
const pdfFrame = document.getElementById('pdfFrame');
const pdfLoading = document.getElementById('pdfLoading');
const pdfError = document.getElementById('pdfError');
const errorMessage = document.getElementById('errorMessage');
const zoomLevelDisplay = document.querySelector('.zoom-level');
const zoomButtons = document.querySelectorAll('.zoom-btn');
const mediumRadios = document.querySelectorAll('input[name="medium"]');
const retryPdfBtn = document.getElementById('retryPdfBtn');

// Variables
let currentSection = 1;
const totalSections = 3;
let paperId = '';
let selectedMedium = '';
let zoomLevel = 1;
let pdfUrl = '';
let closeTime = null;
let timerInterval = null;

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
        document.getElementById('errorMessage').textContent = 'This paper link is invalid. Please check the URL and try again.';
        document.getElementById('pdfError').style.display = 'flex';
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

    database.ref('papers/' + paperId).once('value').then(snapshot => {
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

        // Hardcode the medium options since we know each paper has both
        document.getElementById('paperMediums').textContent = 'Sinhala, English';
        
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

// Load PDF based on selected medium
function loadPdf() {
    const selected = document.querySelector('input[name="medium"]:checked');
    if (!selected) {
        showPdfError('Please select a medium first');
        return;
    }
    

    selectedMedium = selected.value;
    pdfLoading.style.display = 'flex';
    pdfError.style.display = 'none';
    pdfFrame.style.display = 'none';

    // First try the direct path
    const path = `papers/${paperId}/paper-${selectedMedium}.pdf`;
    
    storage.ref(path).getDownloadURL()
        .then((url) => {
            pdfUrl = url;
            pdfFrame.onload = () => {
                pdfLoading.style.display = 'none';
                pdfFrame.style.display = 'block';
            };
            pdfFrame.onerror = () => {
                showPdfError("Failed to display PDF. Please try again.");
            };
            pdfFrame.src = url + '#toolbar=0';
            resetZoom();
        })
        .catch((error) => {
            console.error('Error loading PDF:', error);
            // Try alternative path if first attempt fails
            const altPath = `papers/${paperId}/${selectedMedium}.pdf`;
            storage.ref(altPath).getDownloadURL()
                .then((url) => {
                    pdfUrl = url;
                    pdfFrame.src = url + '#toolbar=0';
                    pdfLoading.style.display = 'none';
                    pdfFrame.style.display = 'block';
                    resetZoom();
                })
                .catch((altError) => {
                    console.error('Alternative path also failed:', altError);
                    showPdfError("Paper not available. Please contact support.");
                });
        });
}

// Show PDF error message
function showPdfError(message) {
    pdfLoading.style.display = 'none';
    pdfError.style.display = 'flex';
    errorMessage.textContent = message;
    pdfFrame.style.display = 'none';
}

// Reset zoom level
function resetZoom() {
    zoomLevel = 1;
    zoomLevelDisplay.textContent = '100%';
    pdfFrame.style.transform = 'scale(1)';
    pdfFrame.style.transformOrigin = '0 0';
}

// Handle zoom buttons
function handleZoom(action) {
    if (action === 'zoom-in') {
        zoomLevel = Math.min(zoomLevel + 0.1, 2); // Max zoom 200%
    } else {
        zoomLevel = Math.max(zoomLevel - 0.1, 0.5); // Min zoom 50%
    }
    
    zoomLevelDisplay.textContent = `${Math.round(zoomLevel * 100)}%`;
    pdfFrame.style.transform = `scale(${zoomLevel})`;
    pdfFrame.style.transformOrigin = '0 0';
}

// Load questions for answer section
function loadQuestions() {
    database.ref(`papers/${paperId}/questions`).once('value').then(snapshot => {
        const questions = snapshot.val() || {};
        
        // Clear existing questions
        questionsContainer.innerHTML = '';
        
        // Create table rows for each question
        for (const [qNum, question] of Object.entries(questions)) {
            const row = document.createElement('tr');
            row.className = 'question-item';
            row.dataset.questionNumber = qNum;
            row.innerHTML = `
                <td>${qNum}</td>
                <td><input type="radio" class="answer-radio" name="q${qNum}" value="1" required></td>
                <td><input type="radio" class="answer-radio" name="q${qNum}" value="2" required></td>
                <td><input type="radio" class="answer-radio" name="q${qNum}" value="3" required></td>
                <td><input type="radio" class="answer-radio" name="q${qNum}" value="4" required></td>
                <td><input type="radio" class="answer-radio" name="q${qNum}" value="5" required></td>
            `;
            questionsContainer.appendChild(row);
        }

        // Add visual feedback for answered questions
        document.querySelectorAll('.answer-radio').forEach(radio => {
            radio.addEventListener('change', function() {
                const questionNumber = this.name.substring(1);
                const questionRow = document.querySelector(`tr[data-question-number="${questionNumber}"]`);
                if (questionRow) {
                    questionRow.classList.add('answered');
                }
            });
        });
    }).catch(error => {
        console.error('Error loading questions:', error);
        alert('Error loading questions. Please try again.');
    });
}

// Handle form submission
function handleSubmit() {
    // Validate all questions are answered
    const totalQuestions = document.querySelectorAll('.question-item').length;
    const answeredQuestions = document.querySelectorAll('input[type="radio"]:checked').length;
    
    if (answeredQuestions < totalQuestions) {
        alert('Please answer all questions before submitting.');
        return;
    }

    // Get personal info
    const nic = document.getElementById('nic').value.trim();
    const name = document.getElementById('name').value.trim();
    const district = document.getElementById('district').value;
    const studentClass = document.getElementById('class').value;
    const school = document.getElementById('school').value.trim();
    const phone = document.getElementById('phone').value.trim();
    
    // Get all answers
    const answers = {};
    document.querySelectorAll('input[type="radio"]:checked').forEach(input => {
        const qNum = input.name.substring(1); // Remove 'q' prefix
        answers[qNum] = input.value;
    });
    
    // Disable submit button to prevent duplicate submissions
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Submitting...';
    
    // Calculate score
    database.ref(`papers/${paperId}/questions`).once('value').then(snapshot => {
        const questions = snapshot.val() || {};
        
        let score = 0;
        let totalPossible = 0;
        
        for (const [qNum, question] of Object.entries(questions)) {
            totalPossible += question.marks || 0;
            if (answers[qNum] && answers[qNum] === question.answer) {
                score += question.marks || 0;
            }
        }
        
        // Prepare submission data
        const submission = {
            name,
            nic,
            district,
            class: studentClass,
            school: school || '',
            phone: phone || '',
            medium: selectedMedium,
            answers,
            score,
            totalPossible,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };
        
        // Submit data to database
        return database.ref(`submissions/${paperId}/${nic}`).set(submission)
            .then(() => ({ score, totalPossible })); // Return score data for success message
    }).then(({ score, totalPossible }) => {
        // Show success section with score details
        document.getElementById('sectionSuccess').innerHTML = `
            <div class="card">
                <div class="card-body text-center py-5">
                    <div class="success-icon mb-4">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <h2 class="mb-3">Answers Submitted Successfully!</h2>
                    <p class="text-muted mb-3">You scored ${score} out of ${totalPossible} points.</p>
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
                    <p class="text-muted mb-4">Thank you for completing the paper. Your answers have been recorded.</p>
                    <button id="viewResultsBtn" class="btn btn-primary">
                        <i class="fas fa-chart-bar me-2"></i> View Detailed Results
                    </button>
                </div>
            </div>
        `;
        
        showSection('sectionSuccess');
        updateProgress(100);
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
        submitBtn.style.display = 'none';
        
        // Re-attach event listener for the results button
        document.getElementById('viewResultsBtn').addEventListener('click', () => {
            window.location.href = `results.html?paperId=${paperId}&nic=${nic}`;
        });
    }).catch(error => {
        console.error('Submission error:', error);
        alert(`Error: ${error.message}`);
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane me-2"></i> Submit Answers';
    });
}

// Check if NIC has already submitted
function checkDuplicateSubmission(nic) {
    return database.ref(`submissions/${paperId}/${nic}`).once('value').then(snapshot => {
        return snapshot.exists();
    });
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
    
    // Load PDF if moving to section 2 (View Paper)
    if (currentSection === 1) {
        const medium = document.querySelector('input[name="medium"]:checked');
        if (!medium) {
            alert('Please select a medium first');
            return;
        }
        selectedMedium = medium.value;
    }
    
    // Load questions if moving to section 3 (Submit Answers)
    if (currentSection === 2) {
        loadQuestions();
    }
    
    currentSection++;
    showSection(`section${currentSection}`);
    updateProgress((currentSection / totalSections) * 100);
    
    // Load PDF automatically when entering section 2
    if (currentSection === 2) {
        loadPdf();
    }
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
    loadPaperDetails();
    updateProgress(33); // Initial progress for first section
    prevBtn.disabled = true;

    // Initialize buttons
    updateButtonVisibility();
    
    // Get paperId first
    paperId = getPaperIdFromUrl();
    if (!paperId) {
        // Show error but don't redirect (let the user see the error)
        return;
    }

    // Prevent right-click and text selection on PDF view section
    document.addEventListener('contextmenu', e => {
        if (currentSection === 2) {
            e.preventDefault();
        }
    });
    
    document.addEventListener('selectstart', e => {
        if (currentSection === 2) {
            e.preventDefault();
        }
    });

    console.log("Initialization complete");
}

// Event listeners
themeToggle.addEventListener('click', toggleTheme);
prevBtn.addEventListener('click', prevSection);
nextBtn.addEventListener('click', nextSection);
submitBtn.addEventListener('click', handleSubmit);

// Medium selection change
mediumRadios.forEach(radio => {
    radio.addEventListener('change', () => {
        if (currentSection === 2) {
            loadPdf();
        }
    });
});

// Zoom buttons
zoomButtons.forEach(btn => {
    btn.addEventListener('click', () => handleZoom(btn.dataset.action));
});

// Retry PDF button
if (retryPdfBtn) {
    retryPdfBtn.addEventListener('click', loadPdf);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializePage);