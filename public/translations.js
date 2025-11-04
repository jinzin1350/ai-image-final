// Complete translations for the landing page
const translations = {
    fa: {
        // Navigation
        nav: {
            features: "امکانات",
            showcase: "نمونه‌کارها",
            howItWorks: "نحوه کار",
            pricing: "قیمت‌گذاری",
            startFree: "شروع رایگان",
            language: "فارسی"
        },

        // Hero Section
        hero: {
            badge: "قدرت هوش مصنوعی در خدمت کسب‌وکار شما",
            titlePart1: "استودیو عکاسی در",
            titlePart2: "جیب شما",
            description: "دیگر نیازی به استودیو گران‌قیمت، مدل حرفه‌ای و تجهیزات پیچیده نیست. با هوش مصنوعی پیشرفته، در عرض ثانیه‌ها عکس‌های استودیویی باکیفیت از محصولات خود بگیرید.",
            photosGenerated: "عکس تولید شده",
            activeBusinesses: "کسب‌وکار فعال",
            userRating: "امتیاز کاربران",
            startFree: "شروع رایگان",
            watchDemo: "مشاهده ویدیو",
            security: "🔒 امنیت تضمین شده",
            fastProcessing: "⚡ پردازش سریع",
            professionalQuality: "✨ کیفیت حرفه‌ای",
            beforeLabel: "عکس معمولی",
            afterLabel: "نتیجه AI"
        },

        // Features Section
        features: {
            badge: "چرا استودیو AI؟",
            title: "امکاناتی که کسب‌وکار شما را متحول می‌کند",
            description: "تکنولوژی پیشرفته هوش مصنوعی برای ایجاد تصاویر حرفه‌ای که فروش شما را افزایش می‌دهد"
        },

        // Services Section
        services: {
            badge: "پکیج‌های حرفه‌ای",
            title: "عکاسی استودیویی با هوش مصنوعی",
            description: "برند خود را با عکس‌های حرفه‌ای به سطح بعدی برسانید - بدون نیاز به استودیو و مدل واقعی",
            cta: "🚀 برندهای برتر به ما اعتماد کرده‌اند - شما هم شروع کنید",
            ctaButton: "شروع رایگان - ۱۰ عکس هدیه"
        },

        // Showcase Section
        showcase: {
            badge: "نمونه کارها",
            title: "نتایج واقعی از مشتریان ما",
            description: "کیفیت استودیویی بدون هزینه‌های سنگین",
            allTab: "همه",
            studioTab: "استودیو سفید",
            outdoorTab: "فضای باز",
            lifestyleTab: "لایف‌استایل"
        },

        // How It Works Section
        howItWorks: {
            badge: "نحوه کار",
            title: "در ۳ قدم ساده به نتیجه برسید",
            step1Title: "آپلود محصول",
            step1Description: "عکس لباس یا محصول خود را آپلود کنید. هر فرمتی قابل قبول است",
            step2Title: "تنظیمات دلخواه",
            step2Description: "مدل، پس‌زمینه و استایل مورد نظر خود را انتخاب کنید",
            step3Title: "دانلود نتیجه",
            step3Description: "در عرض ثانیه‌ها عکس حرفه‌ای خود را دریافت کنید"
        },

        // Pricing Section
        pricing: {
            badge: "قیمت‌گذاری",
            title: "پلنی متناسب با نیاز شما",
            description: "بدون هزینه پنهان، لغو در هر زمان",

            // Starter Plan
            starter: {
                name: "پلن استارتر",
                subtitle: "برای برندهای تازه‌کار",
                price: "2,999,000",
                period: "تومان/ماه",
                features: [
                    "۱۳۰ عکس در ماه",
                    "عکاسی استایل کامل",
                    "عکاسی Flat Lay",
                    "عکاسی یک اکسسوری",
                    "مدل‌های پیش‌فرض",
                    "کیفیت 4K",
                    "کپشن اینستاگرام خودکار",
                    "توضیحات محصول برای سایت"
                ],
                cta: "شروع کنید"
            },

            // Business Plan
            business: {
                name: "پلن بیزینس",
                subtitle: "برای برندهای در حال رشد",
                popularBadge: "محبوب‌ترین",
                price: "5,990,000",
                period: "تومان/ماه",
                features: [
                    "۲۰۰ عکس در ماه",
                    "۵ مدل اختصاصی",
                    "عکاسی استایل + اکسسوری + Flat Lay",
                    "چیدمان رنگی کالکشن",
                    "۵۰ پس‌زمینه مختلف",
                    "کیفیت ۴K",
                    "نگهداری عکس‌ها تا ۳۰ روز",
                    "کپشن اینستاگرام + توضیحات محصول"
                ],
                cta: "شروع کنید"
            },

            // Enterprise Plan
            enterprise: {
                name: "پلن انترپرایز",
                subtitle: "برای برندهای بزرگ و آژانس‌ها",
                price: "9,999,000",
                period: "تومان/ماه",
                features: [
                    "۲۵۰ عکس در ماه",
                    "۱۰ مدل اختصاصی",
                    "تمام سرویس‌ها: استایل + اکسسوری + Flat Lay",
                    "چیدمان رنگی کالکشن",
                    "عکاسی با تِم برندهای معروف",
                    "۵۰ پس‌زمینه + کیفیت ۴K",
                    "نگهداری عکس‌ها برای ۶۰ روز",
                    "کپشن اینستاگرام + توضیحات محصول AI",
                    "پشتیبانی اختصاصی ۲۴/۷"
                ],
                cta: "شروع کنید"
            }
        },

        // Testimonials Section
        testimonials: {
            badge: "نظر مشتریان",
            title: "چرا کسب‌وکارها ما را دوست دارند"
        },

        // CTA Section
        cta: {
            title: "آماده برای تحول در کسب‌وکار خود هستید؟",
            subtitle: "امروز شروع کنید و تفاوت را تجربه کنید",
            startFree: "شروع رایگان",
            viewPricing: "مشاهده قیمت‌ها",
            noCredit: "✓ بدون نیاز به کارت اعتباری",
            cancelAnytime: "✓ لغو در هر زمان",
            support247: "✓ پشتیبانی ۲۴/۷"
        },

        // Footer
        footer: {
            description: "دستیار هوش مصنوعی شما برای تولید عکس‌های حرفه‌ای محصول. ساده، سریع و با کیفیت استودیویی.",
            copyright: "© ۱۴۰۳ استودیو AI. تمامی حقوق محفوظ است.",
            product: "محصول",
            company: "شرکت",
            support: "پشتیبانی",
            legal: "قانونی"
        }
    },

    en: {
        // Navigation
        nav: {
            features: "Features",
            showcase: "Showcase",
            howItWorks: "How it Works",
            pricing: "Pricing",
            startFree: "Start Free",
            language: "English"
        },

        // Hero Section
        hero: {
            badge: "AI Power for Your Business",
            titlePart1: "Photo Studio in",
            titlePart2: "Your Pocket",
            description: "No more expensive studios, professional models, or complex equipment. With advanced AI, create studio-quality product photos in seconds.",
            photosGenerated: "Photos Generated",
            activeBusinesses: "Active Businesses",
            userRating: "User Rating",
            startFree: "Start Free",
            watchDemo: "Watch Demo",
            security: "🔒 Guaranteed Security",
            fastProcessing: "⚡ Fast Processing",
            professionalQuality: "✨ Professional Quality",
            beforeLabel: "Regular Photo",
            afterLabel: "AI Result"
        },

        // Features Section
        features: {
            badge: "Why AI Studio?",
            title: "Features That Transform Your Business",
            description: "Advanced AI technology to create professional images that boost your sales"
        },

        // Services Section
        services: {
            badge: "Professional Packages",
            title: "Studio Photography with AI",
            description: "Take your brand to the next level with professional photos - no studio or real models needed",
            cta: "🚀 Top brands trust us - Start today",
            ctaButton: "Start Free - 10 Photos Gift"
        },

        // Showcase Section
        showcase: {
            badge: "Showcase",
            title: "Real Results from Our Customers",
            description: "Studio quality without heavy costs",
            allTab: "All",
            studioTab: "White Studio",
            outdoorTab: "Outdoor",
            lifestyleTab: "Lifestyle"
        },

        // How It Works Section
        howItWorks: {
            badge: "How it Works",
            title: "Get Results in 3 Simple Steps",
            step1Title: "Upload Product",
            step1Description: "Upload your clothing or product photo. Any format accepted",
            step2Title: "Choose Settings",
            step2Description: "Select your preferred model, background and style",
            step3Title: "Download Result",
            step3Description: "Receive your professional photo in seconds"
        },

        // Pricing Section
        pricing: {
            badge: "Pricing",
            title: "Choose Your Perfect Plan",
            description: "No hidden fees, cancel anytime",

            // Starter Plan
            starter: {
                name: "Starter Plan",
                subtitle: "For new brands",
                price: "$99",
                period: "/month",
                features: [
                    "130 photos per month",
                    "Full style photography",
                    "Flat Lay photography",
                    "Single accessory photography",
                    "Default models",
                    "4K quality",
                    "Auto Instagram captions",
                    "Product descriptions for website"
                ],
                cta: "Get Started"
            },

            // Business Plan
            business: {
                name: "Business Plan",
                subtitle: "For growing brands",
                popularBadge: "Most Popular",
                price: "$149",
                period: "/month",
                features: [
                    "200 photos per month",
                    "5 custom models",
                    "Style + Accessory + Flat Lay photography",
                    "Colorful collection arrangements",
                    "50 different backgrounds",
                    "4K quality",
                    "Photo storage for 30 days",
                    "Instagram captions + product descriptions"
                ],
                cta: "Get Started"
            },

            // Enterprise Plan
            enterprise: {
                name: "Enterprise Plan",
                subtitle: "For large brands & agencies",
                price: "$199",
                period: "/month",
                features: [
                    "250 photos per month",
                    "10 custom models",
                    "All services: Style + Accessory + Flat Lay",
                    "Colorful collection arrangements",
                    "Famous brand theme photography",
                    "50 backgrounds + 4K quality",
                    "Photo storage for 60 days",
                    "Instagram captions + AI product descriptions",
                    "Dedicated 24/7 support"
                ],
                cta: "Get Started"
            }
        },

        // Testimonials Section
        testimonials: {
            badge: "Customer Reviews",
            title: "Why Businesses Love Us"
        },

        // CTA Section
        cta: {
            title: "Ready to Transform Your Business?",
            subtitle: "Start today and experience the difference",
            startFree: "Start Free",
            viewPricing: "View Pricing",
            noCredit: "✓ No credit card required",
            cancelAnytime: "✓ Cancel anytime",
            support247: "✓ 24/7 Support"
        },

        // Footer
        footer: {
            description: "Your AI assistant for creating professional product photos. Simple, fast, and studio quality.",
            copyright: "© 2024 AI Studio. All rights reserved.",
            product: "Product",
            company: "Company",
            support: "Support",
            legal: "Legal"
        }
    }
};

// Export for use in other scripts
window.translations = translations;
