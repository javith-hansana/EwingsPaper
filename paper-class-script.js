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
const answerForm = document.getElementById('answerForm');
const mcqQuestionsContainer = document.getElementById('mcqQuestionsContainer');

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

// Load paper details and questions
function loadPaperQuestions() {
    const paperId = getPaperIdFromUrl();
    console.log("[DEBUG] Paper ID from URL:", paperId, "Type:", typeof paperId);
    if (!paperId) {
        console.error("[ERROR] No paper ID found in URL");
        alert('Invalid paper link');
        return;
    }

    const paperPath = `paperClassPapers/${paperId}`;
    console.log("[DEBUG] Full database path:", paperPath);

    document.getElementById('paperId').value = paperId;
    const startTime = Date.now();

    // Load paper details
     database.ref(paperPath).once('value').then(snapshot => {
        console.log(`[DEBUG] Query completed in ${Date.now() - startTime}ms`);
        console.log("[DEBUG] Snapshot exists:", snapshot.exists());
        console.log("[DEBUG] Snapshot value:", snapshot.val());
        const paper = snapshot.val();
        if (!snapshot.exists()) {
            console.error("[ERROR] Paper not found at path:", paperPath);
            alert('Paper not found');
            return;
        }
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

        // Show medium selection if multiple options
        if (mediums.length > 1) {
            const mediumOptions = document.getElementById('mediumOptions');
            mediumOptions.innerHTML = '';
            
            mediums.forEach(medium => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'medium-btn btn btn-outline-primary';
                btn.textContent = medium;
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.medium-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    document.getElementById('selectedMedium').value = medium;
                    loadQuestionsForMedium(paperId, medium);
                });
                mediumOptions.appendChild(btn);
            });
            
            document.getElementById('mediumSelection').style.display = 'block';
        } else if (mediums.length === 1) {
            // Only one medium, select it automatically
            document.getElementById('selectedMedium').value = mediums[0];
            loadQuestionsForMedium(paperId, mediums[0]);
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

// Load questions for selected medium
function loadQuestionsForMedium(paperId, medium) {
    database.ref(`paperClassPapers/${paperId}/questions`).once('value').then(snapshot => {
        const allQuestions = snapshot.val() || {};
        
        // Filter questions by medium if available
        let questions = {};
        if (allQuestions[medium]) {
            questions = allQuestions[medium];
        } else {
            questions = allQuestions;
        }

        // Check if there are MCQ questions
        const mcqQuestions = Object.entries(questions).filter(([_, q]) => q.type === 'mcq');
        const hasMcqQuestions = mcqQuestions.length > 0;
        
        // Check if there are essay questions
        const essayQuestions = Object.entries(questions).filter(([_, q]) => q.type === 'essay');
        const hasEssayQuestions = essayQuestions.length > 0;

        // Display MCQ answer sheet if there are MCQ questions
        if (hasMcqQuestions) {
            document.getElementById('mcqSection').style.display = 'block';
            
            // Display MCQ questions
            mcqQuestionsContainer.innerHTML = '';
            mcqQuestions.forEach(([qNum, question]) => {
                const row = document.createElement('tr');
                row.className = 'question-item';
                row.dataset.questionNumber = qNum;
                row.innerHTML = `
                    <td>${qNum}</td>
                    <td><input type="radio" class="answer-radio" name="q${qNum}" value="1" ${question.required ? 'required' : ''}></td>
                    <td><input type="radio" class="answer-radio" name="q${qNum}" value="2" ${question.required ? 'required' : ''}></td>
                    <td><input type="radio" class="answer-radio" name="q${qNum}" value="3" ${question.required ? 'required' : ''}></td>
                    <td><input type="radio" class="answer-radio" name="q${qNum}" value="4" ${question.required ? 'required' : ''}></td>
                    <td><input type="radio" class="answer-radio" name="q${qNum}" value="5" ${question.required ? 'required' : ''}></td>
                `;
                mcqQuestionsContainer.appendChild(row);
            });

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
        } else {
            document.getElementById('mcqSection').style.display = 'none';
        }

        // Display essay answer section if there are essay questions
        if (hasEssayQuestions) {
            document.getElementById('essaySection').style.display = 'block';
            document.getElementById('essayAnswers').required = true;
        } else {
            document.getElementById('essaySection').style.display = 'none';
            document.getElementById('essayAnswers').required = false;
        }

        // Show submit button if there are any questions
        if (hasMcqQuestions || hasEssayQuestions) {
            document.getElementById('submitBtn').style.display = 'block';
        } else {
            document.getElementById('submitBtn').style.display = 'none';
            alert('This paper has no questions to answer.');
        }

    }).catch(error => {
        console.error('Error loading questions:', error);
        alert('Error loading questions. Please try again.');
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
            document.getElementById('submitBtn').disabled = true;
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

// Handle form submission
function handleSubmit(e) {
    e.preventDefault();
    
    const paperId = document.getElementById('paperId').value;
    const medium = document.getElementById('selectedMedium').value;
    const nic = document.getElementById('nic').value.trim();
    const name = document.getElementById('name').value.trim();
    const district = document.getElementById('district').value;
    const studentClass = document.getElementById('class').value;
    const school = document.getElementById('school').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const essayFile = document.getElementById('essayAnswers').files[0];
    
    // Validate required fields
    if (!nic || !name || !district || !studentClass) {
        alert('Please fill in all required fields (marked with *)');
        return;
    }
    
    // Validate NIC format (example: 123456789V or 200012345678)
    const nicRegex = /^([0-9]{9}[vVxX]|[0-9]{12})$/;
    if (!nicRegex.test(nic)) {
        alert('Please enter a valid NIC number (either 9 digits with V/X or 12 digits)');
        return;
    }
    
    if (!medium) {
        alert('Please select a medium first');
        return;
    }
    
    // Check if time has expired
    if (document.getElementById('timeRemaining').textContent === "TIME EXPIRED") {
        alert('The submission time has expired. Your answers cannot be submitted.');
        return;
    }
    
    // Check if there are essay questions
    const hasEssayQuestions = document.getElementById('essaySection').style.display !== 'none';
    if (hasEssayQuestions) {
        if (!essayFile) {
            alert('Please select a file to upload');
            return;
        }

        console.log("File validation:", {
            name: essayFile.name,
            size: essayFile.size,
            type: essayFile.type
        });

        // Validate file extension
        const fileExtension = essayFile.name.split('.').pop().toLowerCase();
        if (fileExtension !== 'pdf') {
            alert('Only PDF files are allowed.');
            return false;
        }

        // Validate file size (5MB max)
        if (essayFile.size > 5 * 1024 * 1024) {
            alert('File exceeds 5MB limit.');
            return;
        }
    }
    
    // Disable submit button to prevent duplicate submissions
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Checking...';
    
    // First check if user is registered and verified by searching for their NIC
    database.ref('users').orderByChild('nic').equalTo(nic).once('value').then(userSnapshot => {
        if (!userSnapshot.exists()) {
            alert('You must be a registered and verified user to submit answers. Please register first.');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane me-2"></i> Submit Answers';
            return;
        }
        
        // Check if any of the found users is verified
        let verified = false;
        userSnapshot.forEach(childSnapshot => {
            if (childSnapshot.val().verified) {
                verified = true;
            }
        });
        
        if (!verified) {
            alert('Your account is not yet verified. Please wait for verification or contact support.');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane me-2"></i> Submit Answers';
            return;
        }
        
        // Then check if this user has already submitted for this paper
        database.ref(`paperClassSubmissions/${paperId}/${nic}`).once('value').then(submissionSnapshot => {
            if (submissionSnapshot.exists()) {
                alert('You have already submitted answers for this paper. Duplicate submissions are not allowed.');
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-paper-plane me-2"></i> Submit Answers';
                return;
            }
            
            // If all checks pass, proceed with submission
            proceedWithSubmission(paperId, medium, nic, name, district, studentClass, school, phone, essayFile, hasEssayQuestions, submitBtn);
        }).catch(error => {
            console.error('Error checking existing submission:', error);
            alert('Error checking submission status. Please try again.');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane me-2"></i> Submit Answers';
        });
    }).catch(error => {
        console.error('Error checking user registration:', error);
        alert('Error checking user registration. Please try again.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane me-2"></i> Submit Answers';
    });
}

function proceedWithSubmission(paperId, medium, nic, name, district, studentClass, school, phone, essayFile, hasEssayQuestions, submitBtn) {
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Submitting...';
    
    // Prepare submission data
    const submission = {
        name,
        nic,
        district,
        class: studentClass,
        school: school || '',
        phone: phone || '',
        medium,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        submittedAt: new Date().toISOString(),
        verified: true
    };
    
    // Get MCQ answers if there are MCQ questions
    const hasMcqQuestions = document.getElementById('mcqSection').style.display !== 'none';
    if (hasMcqQuestions) {
        const mcqAnswers = {};
        const questionInputs = document.querySelectorAll('input[type="radio"]:checked');
        
        // Check if all required MCQ questions are answered
        const requiredQuestions = document.querySelectorAll('input[type="radio"][required]');
        const answeredRequiredQuestions = document.querySelectorAll('input[type="radio"][required]:checked');
        
        if (requiredQuestions.length > 0 && answeredRequiredQuestions.length !== requiredQuestions.length) {
            alert('Please answer all required MCQ questions');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane me-2"></i> Submit Answers';
            return;
        }
        
        questionInputs.forEach(input => {
            const qNum = input.name.substring(1);
            mcqAnswers[qNum] = input.value;
        });
        
        submission.mcqAnswers = mcqAnswers;
    }

    // If no essay file is needed, save directly
    if (!hasEssayQuestions) {
        saveSubmission(paperId, nic, submission, submitBtn);
        return;
    }

    // Validate essay file before upload
    if (!essayFile) {
        alert('Please select a file to upload');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane me-2"></i> Submit Answers';
        return;
    }

    if (essayFile.size === 0) {
        alert('The selected file is empty. Please choose a valid file.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane me-2"></i> Submit Answers';
        return;
    }

    // Check file type with more flexible validation
    const validExtensions = ['application/pdf', 'pdf', 'application/octet-stream'];
    const fileExtension = essayFile.name.split('.').pop().toLowerCase();
    if (!validExtensions.includes(essayFile.type.toLowerCase())) {
        // Fallback check for file extension
        if (fileExtension !== 'pdf') {
            alert('Please upload a valid PDF file.');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane me-2"></i> Submit Answers';
            return;
        }
    }

    // Check file size (5MB max)
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    if (essayFile.size > MAX_FILE_SIZE) {
        alert('File is too large. Maximum size is 5MB.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane me-2"></i> Submit Answers';
        return;
    }

    // Generate a unique filename with timestamp and original filename
    const timestamp = new Date().getTime();
    const filename = `${timestamp}_${essayFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    
    // Proceed with file upload
    const storageRef = storage.ref(`paperClassSubmissions/${paperId}/${nic}/${filename}`);
    retryCount = 0; // Reset retry counter
    uploadWithRetry(storageRef, essayFile, submission, paperId, nic, submitBtn);
}


function handleUploadError(error, submitBtn) {
    let errorMessage = 'Error uploading file: ';
    
    switch(error.code) {
        case 'storage/unauthorized':
            errorMessage += 'You don\'t have permission to upload files.';
            break;
        case 'storage/canceled':
            errorMessage += 'Upload was canceled.';
            break;
        case 'storage/unknown':
            errorMessage += 'Unknown error occurred. Please check your internet connection.';
            break;
        case 'storage/quota-exceeded':
            errorMessage += 'Storage quota exceeded. Contact support.';
            break;
        case 'storage/unauthenticated':
            errorMessage += 'Authentication required. Please refresh the page and try again.';
            break;
        default:
            errorMessage += error.message || 'Please try again.';
    }
    
    alert(errorMessage);
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-paper-plane me-2"></i> Submit Answers';
}

// Save submission to database
function saveSubmission(paperId, nic, submission, submitBtn) {
    database.ref(`paperClassSubmissions/${paperId}/${nic}`).set(submission)
        .then(() => {
            alert('Answers submitted successfully!');
            window.location.href = `results.html?paperId=${paperId}&nic=${nic}`;
        })
        .catch(error => {
            console.error('Submission error:', error);
            alert(`Error: ${error.message}`);
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane me-2"></i> Submit Answers';
        });
}
// Check if user is registered and auto-fill info
function checkRegisteredUser() {
    const nic = localStorage.getItem('userNIC');
    if (nic) {
        // Search users by NIC instead of UID
        database.ref('users').orderByChild('nic').equalTo(nic).once('value').then(snapshot => {
            if (snapshot.exists()) {
                snapshot.forEach(userSnapshot => {
                    const user = userSnapshot.val();
                    document.getElementById('nic').value = nic;
                    document.getElementById('name').value = user.name || '';
                    document.getElementById('district').value = user.district || '';
                    document.getElementById('class').value = user.class || '';
                    document.getElementById('school').value = user.school || '';
                    document.getElementById('phone').value = user.phone || '';
                });
            }
        });
    }
}

let retryCount = 0;
const maxRetries = 3;

function uploadWithRetry(storageRef, file, submission, paperId, nic, submitBtn) {
    console.log("Starting upload...");
    
    // Add metadata to ensure proper content type
    const metadata = {
        contentType: 'application/pdf'
    };
    
    const uploadTask = storageRef.put(file, metadata);
    
    uploadTask.on('state_changed',
        (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log(`Upload progress: ${progress.toFixed(2)}%`);
            submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Uploading ${Math.round(progress)}%...`;
            
            // Force UI update
            setTimeout(() => {}, 0);
        },
        (error) => {
            console.error("Upload error details:", {
                code: error.code,
                message: error.message,
                name: error.name,
                serverResponse: error.serverResponse
            });
            
            if (retryCount < maxRetries) {
                retryCount++;
                console.log(`Retrying upload (attempt ${retryCount})...`);
                setTimeout(() => uploadWithRetry(storageRef, file, submission, paperId, nic, submitBtn), 2000);
            } else {
                handleUploadError(error, submitBtn);
            }
        },
        () => {
            uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
                console.log("File available at", downloadURL);
                submission.essayAnswersUrl = downloadURL;
                saveSubmission(paperId, nic, submission, submitBtn);
            });
        }
    );
}

auth.onAuthStateChanged((user) => {
  if (user) {
    // User is signed in
    console.log("User is authenticated:", user.uid);
  } else {
    // No user is signed in
    console.log("No user signed in");
    // You might want to redirect to login here
  }
});

// Event listeners
themeToggle.addEventListener('click', toggleTheme);
answerForm.addEventListener('submit', handleSubmit);

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    checkTheme();
    checkRegisteredUser();
    loadPaperQuestions();
});

