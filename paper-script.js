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
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();
const storage = firebase.storage();

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
const zoomLevelDisplay = document.querySelector('.zoom-level');
const zoomButtons = document.querySelectorAll('.zoom-btn');

// Variables
let currentSection = 1;
let totalSections = 3;
let paperId = '';
let selectedMedium = '';
let zoomLevel = 1;
let pdfUrl = '';

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
    return urlParams.get('paperId');
}

// Load paper details
function loadPaperDetails() {
    paperId = getPaperIdFromUrl();
    if (!paperId) {
        alert('Invalid paper link');
        window.location.href = 'index.html';
        return;
    }

    // Load paper details
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

        // Handle multiple mediums
        let mediums = [];
        if (paper.mediums) {
            mediums = paper.mediums;
            document.getElementById('paperMediums').textContent = mediums.join(', ');
        } else if (paper.medium) {
            mediums = [paper.medium];
            document.getElementById('paperMediums').textContent = paper.medium;
        } else {
            document.getElementById('paperMediums').textContent = 'Not specified';
        }

        // Set up countdown timer
        if (paper.closeTime) {
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
    
    const timer = setInterval(function() {
        const now = new Date().getTime();
        const distance = countDownDate - now;
        
        if (distance < 0) {
            clearInterval(timer);
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
// Modified loadPdf function to correct the URL issue
function loadPdf() {
    const loadingIndicator = document.getElementById('pdfLoading');
    const pdfFrame = document.getElementById('pdfFrame');
    
    loadingIndicator.style.display = 'block';
    pdfFrame.style.display = 'none';
    
    selectedMedium = document.querySelector('input[name="medium"]:checked').value;
    
    // Correct file path pattern
    const filePath = `papers/${paperId}/${selectedMedium === 'sinhala' ? 'paper-sinhala' : 'paper-english'}.pdf`;
    console.log('Attempting to load PDF from:', filePath);
    
    const storageRef = storage.ref(filePath);
    
    storageRef.getDownloadURL().then((url) => {
        console.log('PDF URL:', url);
        pdfUrl = url;
        
        // Use the URL directly without modification
        pdfFrame.src = url + '#toolbar=0&navpanes=0&scrollbar=0';
        
        pdfFrame.onload = function() {
            loadingIndicator.style.display = 'none';
            pdfFrame.style.display = 'block';
        };
        
        pdfFrame.onerror = function() {
            loadingIndicator.style.display = 'none';
            console.error('Iframe failed to load PDF');
            alert('Error loading PDF. Please try again or contact support.');
        };
    }).catch(error => {
        loadingIndicator.style.display = 'none';
        console.error('Error getting download URL:', error);
        
        // More detailed error message
        let errorMessage = 'Error loading PDF. Please try again or contact support.';
        if (error.code === 'storage/object-not-found') {
            errorMessage = 'The requested PDF file was not found. Please check if the paper exists for the selected medium.';
        }
        alert(errorMessage);
    });
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
        
        // Display answer sheet
        questionsContainer.innerHTML = '';
        
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
    const nic = document.getElementById('nic').value.trim();
    const name = document.getElementById('name').value.trim();
    const district = document.getElementById('district').value;
    const studentClass = document.getElementById('class').value;
    const school = document.getElementById('school').value.trim();
    const phone = document.getElementById('phone').value.trim();
    
    // Get all answers
    const answers = {};
    const questionInputs = document.querySelectorAll('input[type="radio"]:checked');
    
    questionInputs.forEach(input => {
        const qNum = input.name.substring(1); // Remove 'q' prefix
        answers[qNum] = input.value;
    });
    
    // Check if all questions are answered
    const totalQuestions = document.querySelectorAll('.question-item').length;
    if (Object.keys(answers).length < totalQuestions) {
        alert('Please answer all questions before submitting.');
        return;
    }
    
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
        
        // Submit data
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
    sections.forEach(section => {
        if (section.id === sectionId) {
            section.classList.add('active');
        } else {
            section.classList.remove('active');
        }
    });
}

// Navigate to next section
async function nextSection() {
    if (currentSection === 1) {
        // Validate personal info form
        if (!personalInfoForm.checkValidity()) {
            personalInfoForm.reportValidity();
            return;
        }
        
        // Check for duplicate submission
        const nic = document.getElementById('nic').value.trim();
        const isDuplicate = await checkDuplicateSubmission(nic);
        
        if (isDuplicate) {
            alert('This NIC has already submitted answers for this paper.');
            return;
        }
        
        // Load PDF for section 2
        loadPdf();
    } else if (currentSection === 2) {
        // Load questions for section 3
        loadQuestions();
    }
    
    currentSection++;
    showSection(`section${currentSection}`);
    
    // Update navigation buttons
    if (currentSection === totalSections) {
        nextBtn.style.display = 'none';
        submitBtn.style.display = 'block';
    } else {
        nextBtn.style.display = 'block';
        submitBtn.style.display = 'none';
    }
    
    prevBtn.disabled = false;
    updateProgress((currentSection / totalSections) * 100);
}

// Navigate to previous section
function prevSection() {
    currentSection--;
    showSection(`section${currentSection}`);
    
    // Update navigation buttons
    if (currentSection === 1) {
        prevBtn.disabled = true;
    }
    
    nextBtn.style.display = 'block';
    submitBtn.style.display = 'none';
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

// Event listeners
themeToggle.addEventListener('click', toggleTheme);
prevBtn.addEventListener('click', prevSection);
nextBtn.addEventListener('click', nextSection);
submitBtn.addEventListener('click', handleSubmit);
viewResultsBtn.addEventListener('click', () => {
    const nic = document.getElementById('nic').value.trim();
    window.location.href = `results.html?paperId=${paperId}&nic=${nic}`;
});

zoomButtons.forEach(btn => {
    btn.addEventListener('click', () => handleZoom(btn.dataset.action));
});

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    checkTheme();
    checkRegisteredUser();
    loadPaperDetails();
    updateProgress(33); // Initial progress for first section

    // Prevent right-click and text selection
    document.addEventListener('contextmenu', e => {
        if (currentSection === 2) { // Only on PDF view section
            e.preventDefault();
        }
    });
    
    document.addEventListener('selectstart', e => {
        if (currentSection === 2) { // Only on PDF view section
            e.preventDefault();
        }
    });
});
