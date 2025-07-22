// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyD5SRZWB-QwMg7wmyTjcvHZqP-mEdlll_M",
    authDomain: "paper-class-1ab19.firebaseapp.com",
    databaseURL: "https://paper-class-1ab19-default-rtdb.firebaseio.com",
    projectId: "paper-class-1ab19",
    storageBucket: "paper-class-1ab19.firebasestorage.app",
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
const prevBtns = document.querySelectorAll('#prevBtn');
const nextBtns = document.querySelectorAll('#nextBtn');
const submitBtn = document.getElementById('submitBtn');
const progressBar = document.querySelector('.progress-bar');
const steps = document.querySelectorAll('.step');
const sections = document.querySelectorAll('.section');
const personalInfoForm = document.getElementById('personalInfoForm');
const questionsContainer = document.getElementById('questionsContainer');
const mediumRadios = document.querySelectorAll('input[name="medium"]');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const zoomInBtn = document.getElementById('zoomInBtn');
const zoomOutBtn = document.getElementById('zoomOutBtn');
const pageNumSpan = document.getElementById('pageNum');

// Variables
let currentSection = 1;
const totalSections = 3;
let paperId = '';
let selectedMedium = '';
let closeTime = null;
let timerInterval = null;

// PDF Viewer Variables
let pdfDoc = null,
    pageNum = 1,
    pageRendering = false,
    pageNumPending = null,
    scale = 1.0,
    canvas = document.getElementById('pdfCanvas'),
    ctx = canvas.getContext('2d');

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

// Load PDF using pdf.js
function loadPaperPDF() {
    if (!paperId || !selectedMedium) return;
    
    const pdfPath = `papers/${paperId}/paper-${selectedMedium}.pdf`;
    const storageRef = storage.ref();
    
    storageRef.child(pdfPath).getDownloadURL().then(url => {
        // Load PDF using pdf.js
        pdfjsLib.getDocument(url).promise.then(function(pdfDoc_) {
            pdfDoc = pdfDoc_;
            pageNum = 1;
            pageNumSpan.textContent = `Page 1 of ${pdfDoc.numPages}`;
            
            // Enable/disable page buttons
            prevPageBtn.disabled = true;
            nextPageBtn.disabled = pdfDoc.numPages <= 1;
            
            // Render the first page
            renderPage(1);
        }).catch(error => {
            console.error('Error loading PDF:', error);
            alert('Error loading PDF. Please try again.');
        });
    }).catch(error => {
        console.error('Error getting PDF URL:', error);
        alert('Error loading paper PDF. Please try again.');
    });
}

// Render a PDF page
function renderPage(num) {
    pageRendering = true;
    
    pdfDoc.getPage(num).then(function(page) {
        const viewport = page.getViewport({ scale: scale });
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        const renderContext = {
            canvasContext: ctx,
            viewport: viewport
        };
        
        const renderTask = page.render(renderContext);
        
        renderTask.promise.then(function() {
            pageRendering = false;
            if (pageNumPending !== null) {
                renderPage(pageNumPending);
                pageNumPending = null;
            }
        });
    });
    
    pageNumSpan.textContent = `Page ${num} of ${pdfDoc.numPages}`;
}

// Go to previous page
function onPrevPage() {
    if (pageNum <= 1 || pageRendering) return;
    pageNum--;
    renderPage(pageNum);
    nextPageBtn.disabled = false;
    prevPageBtn.disabled = pageNum <= 1;
}

// Go to next page
function onNextPage() {
    if (pageNum >= pdfDoc.numPages || pageRendering) return;
    pageNum++;
    renderPage(pageNum);
    prevPageBtn.disabled = false;
    nextPageBtn.disabled = pageNum >= pdfDoc.numPages;
}

// Set up PDF zoom controls
function setupPDFZoom() {
    zoomInBtn.addEventListener('click', () => {
        if (scale >= 3.0) return;
        scale += 0.25;
        if (pdfDoc) {
            renderPage(pageNum);
        }
    });
    
    zoomOutBtn.addEventListener('click', () => {
        if (scale <= 0.5) return;
        scale -= 0.25;
        if (pdfDoc) {
            renderPage(pageNum);
        }
    });
    
    // Add page navigation event listeners
    prevPageBtn.addEventListener('click', onPrevPage);
    nextPageBtn.addEventListener('click', onNextPage);
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
        updateButtonVisibility();
        
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
    
    // Update all prev buttons
    prevBtns.forEach(btn => {
        btn.style.display = currentSection === 1 ? 'none' : 'block';
        btn.disabled = currentSection === 1;
    });
    
    // Update all next buttons
    nextBtns.forEach(btn => {
        btn.style.display = currentSection >= totalSections ? 'none' : 'block';
    });
    
    // Only show submit button on last section
    submitBtn.style.display = currentSection === totalSections ? 'block' : 'none';
}

// Navigate to next section
function nextSection() {
    if (currentSection >= totalSections) return;
    
    // Validation for current section
    if (currentSection === 1) {
        if (!personalInfoForm.checkValidity()) {
            personalInfoForm.reportValidity();
            return;
        }
        
        const medium = document.querySelector('input[name="medium"]:checked');
        if (!medium) {
            alert('Please select a medium first');
            return;
        }
        selectedMedium = medium.value;
    }
    
    currentSection++;
    showSection(`section${currentSection}`);
    updateProgress((currentSection / totalSections) * 100);
    
    // Load content for the new section
    if (currentSection === 2) {
        loadPaperPDF();
    } else if (currentSection === 3) {
        loadQuestions();
    }
}

function prevSection() {
    if (currentSection <= 1) return;
    
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
    setupPDFZoom();
    updateProgress(33); // Initial progress for first section
    updateButtonVisibility();

    // Initialize buttons
    prevBtns.forEach(btn => {
        btn.addEventListener('click', prevSection);
    });
    
    nextBtns.forEach(btn => {
        btn.addEventListener('click', nextSection);
    });
    
    // Get paperId first
    paperId = getPaperIdFromUrl();
    if (!paperId) {
        // Show error but don't redirect (let the user see the error)
        return;
    }

    console.log("Initialization complete");
}

// Event listeners
themeToggle.addEventListener('click', toggleTheme);
submitBtn.addEventListener('click', handleSubmit);

// Medium selection change
mediumRadios.forEach(radio => {
    radio.addEventListener('change', () => {
        selectedMedium = radio.value;
    });
});

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializePage);

// Block right-click and other download attempts
document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
});

document.addEventListener('keydown', function(e) {
    // Block F12, Ctrl+Shift+I, Ctrl+Shift+C, Ctrl+U
    if (e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && e.key === 'I') || 
        (e.ctrlKey && e.shiftKey && e.key === 'C') || 
        (e.ctrlKey && e.key === 'U')) {
        e.preventDefault();
    }
});
