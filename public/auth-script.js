
const SUPABASE_URL = 'https://trrjixlshamhuhlcevtx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRycmppeGxzaGFtaHVobGNldnR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNDg5MDYsImV4cCI6MjA3NjgyNDkwNn0.BRFbUkbvqGg4J-mMM8p1oilUHfO6cWe3A3xsIVdWcjI';

// Initialize Supabase client
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM Elements
const signInForm = document.getElementById('signInForm');
const signUpForm = document.getElementById('signUpForm');
const loadingOverlay = document.getElementById('loadingOverlay');
const errorMessage = document.getElementById('errorMessage');

// Toggle between sign in and sign up forms
function toggleForms(event) {
    event.preventDefault();
    signInForm.style.display = signInForm.style.display === 'none' ? 'block' : 'none';
    signUpForm.style.display = signUpForm.style.display === 'none' ? 'block' : 'none';
    hideError();
}

// Show loading
function showLoading() {
    loadingOverlay.style.display = 'flex';
}

// Hide loading
function hideLoading() {
    loadingOverlay.style.display = 'none';
}

// Show error
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
}

// Hide error
function hideError() {
    errorMessage.style.display = 'none';
}

// Handle Sign In
async function handleSignIn(event) {
    event.preventDefault();
    hideError();
    showLoading();

    const email = document.getElementById('signInEmail').value;
    const password = document.getElementById('signInPassword').value;

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw error;

        console.log('✅ ورود موفقیت‌آمیز:', data);
        
        // Save session
        localStorage.setItem('supabase_session', JSON.stringify(data.session));
        
        // Redirect to main app
        window.location.href = '/index.html';
    } catch (error) {
        console.error('❌ خطا در ورود:', error);
        showError(error.message || 'خطا در ورود. لطفاً دوباره تلاش کنید.');
    } finally {
        hideLoading();
    }
}

// Handle Sign Up
async function handleSignUp(event) {
    event.preventDefault();
    hideError();

    const email = document.getElementById('signUpEmail').value;
    const password = document.getElementById('signUpPassword').value;
    const passwordConfirm = document.getElementById('signUpPasswordConfirm').value;

    // Validate passwords match
    if (password !== passwordConfirm) {
        showError('رمزهای عبور مطابقت ندارند');
        return;
    }

    // Validate password length
    if (password.length < 6) {
        showError('رمز عبور باید حداقل 6 کاراکتر باشد');
        return;
    }

    showLoading();

    try {
        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password
        });

        if (error) throw error;

        console.log('✅ ثبت نام موفقیت‌آمیز:', data);
        
        // Save session
        if (data.session) {
            localStorage.setItem('supabase_session', JSON.stringify(data.session));
            window.location.href = '/index.html';
        } else {
            // Email confirmation required
            showError('لطفاً ایمیل خود را تأیید کنید و سپس وارد شوید.');
        }
    } catch (error) {
        console.error('❌ خطا در ثبت نام:', error);
        showError(error.message || 'خطا در ثبت نام. لطفاً دوباره تلاش کنید.');
    } finally {
        hideLoading();
    }
}

// Check if user is already logged in
async function checkAuth() {
    const session = localStorage.getItem('supabase_session');
    if (session) {
        try {
            const { data, error } = await supabaseClient.auth.getSession();
            if (data.session) {
                window.location.href = '/index.html';
            }
        } catch (error) {
            console.log('Session expired');
            localStorage.removeItem('supabase_session');
        }
    }
}

// Check auth on page load
checkAuth();
