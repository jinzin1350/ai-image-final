
// Initialize Supabase client - will be set after fetching config
let supabaseClient = null;

// Fetch Supabase config from server
async function initSupabase() {
  try {
    const response = await fetch('/api/supabase-config');
    const config = await response.json();
    
    if (!config.configured) {
      console.error('❌ Supabase is not configured on server');
      return false;
    }
    
    const { createClient } = supabase;
    supabaseClient = createClient(config.url, config.anonKey);
    console.log('✅ Supabase client initialized');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize Supabase:', error);
    return false;
  }
}

// DOM Elements - بعد از لود شدن صفحه
let signInForm, signUpForm, loadingOverlay, errorMessage;

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', async () => {
    signInForm = document.getElementById('signInForm');
    signUpForm = document.getElementById('signUpForm');
    loadingOverlay = document.getElementById('loadingOverlay');
    errorMessage = document.getElementById('errorMessage');
    
    // Initialize Supabase first
    const initialized = await initSupabase();
    if (!initialized) {
        showError('خطا در اتصال به سرور. لطفاً صفحه را رفرش کنید.');
        return;
    }
    
    // Check auth after Supabase is initialized
    checkAuth();
});

// Toggle between sign in and sign up forms
function toggleForms(event) {
    event.preventDefault();
    if (!signInForm || !signUpForm) return;
    signInForm.style.display = signInForm.style.display === 'none' ? 'block' : 'none';
    signUpForm.style.display = signUpForm.style.display === 'none' ? 'block' : 'none';
    hideError();
}

// Show loading
function showLoading() {
    if (loadingOverlay) loadingOverlay.style.display = 'flex';
}

// Hide loading
function hideLoading() {
    if (loadingOverlay) loadingOverlay.style.display = 'none';
}

// Show error
function showError(message) {
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }
}

// Hide error
function hideError() {
    if (errorMessage) errorMessage.style.display = 'none';
}

// Handle Sign In
async function handleSignIn(event) {
    event.preventDefault();
    hideError();
    showLoading();

    if (!supabaseClient) {
        showError('در حال اتصال به سرور...');
        hideLoading();
        return;
    }

    const email = document.getElementById('signInEmail').value;
    const password = document.getElementById('signInPassword').value;

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw error;

        console.log('✅ ورود موفقیت‌آمیز:', data);

        // Save session and token
        localStorage.setItem('supabase_session', JSON.stringify(data.session));
        localStorage.setItem('supabase_token', data.session.access_token);

        // Redirect to main app
        window.location.href = '/app';
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

    if (!supabaseClient) {
        showError('در حال اتصال به سرور...');
        return;
    }

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

        // Save session and token
        if (data.session) {
            localStorage.setItem('supabase_session', JSON.stringify(data.session));
            localStorage.setItem('supabase_token', data.session.access_token);
            window.location.href = '/app';
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
    if (!supabaseClient) {
        console.log('Supabase not initialized yet');
        return;
    }
    
    const session = localStorage.getItem('supabase_session');
    if (session) {
        try {
            const { data, error } = await supabaseClient.auth.getSession();
            if (data.session) {
                window.location.href = '/app';
            }
        } catch (error) {
            console.log('Session expired');
            localStorage.removeItem('supabase_session');
            localStorage.removeItem('supabase_token');
        }
    }
}

// Check auth will be called in DOMContentLoaded event
