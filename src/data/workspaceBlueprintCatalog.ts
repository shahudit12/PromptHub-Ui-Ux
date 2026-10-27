/**
 * src/data/workspaceBlueprintCatalog.ts
 * Curated Pre-Compiled Deliverable Catalog for PromptHub Workspace.
 * Provides instant (<20ms) zero-latency loading for popular example starters
 * and zero-typing outcome blueprints with 0 credit deduction.
 */

import type { WorkFile } from '../types/work';
import type { DownstreamTask } from '../services/ai/unifiedOrchestrator';

export interface InstantDeliverableBlueprint {
  id: string;
  category: 'web' | 'calc' | 'proposal' | 'marketing';
  badge: string;
  title: string;
  description: string;
  prompt: string;
  triggerQueries: string[];
  summary: string;
  files: WorkFile[];
  explanation: string;
  suggestedFollowUps: string[];
  downstreamTasks: DownstreamTask[];
}

const NOW = new Date().toISOString();

// ─── 1. Service Business & Clinic Site ───────────────────────────────────────
const SERVICE_SITE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Apex Dental & Wellness Care — Modern Clinic</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    body { font-family: 'Outfit', system-ui, sans-serif; }
    .font-mono { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body class="bg-slate-950 text-white min-h-screen flex flex-col antialiased selection:bg-teal-500 selection:text-white">

  <!-- Top Announcement Bar -->
  <div class="bg-gradient-to-r from-teal-900 via-slate-900 to-teal-950 border-b border-teal-500/20 py-2 px-4 text-xs font-medium text-slate-300 flex items-center justify-between">
    <div class="flex items-center gap-2 mx-auto">
      <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">EMERGENCY 24/7</span>
      <span>Same-day dental appointments available &bull; Call: <strong class="text-white">+1 (800) 555-APEX</strong></span>
    </div>
  </div>

  <!-- Navigation -->
  <nav class="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
          <i data-lucide="activity" class="w-5 h-5"></i>
        </div>
        <div>
          <span class="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
            Apex Dental <span class="text-teal-400 font-mono text-xs px-1.5 py-0.5 rounded bg-teal-500/10 border border-teal-500/20">CLINIC</span>
          </span>
          <p class="text-[10px] text-slate-400">Medical Excellence &bull; Est. 2011</p>
        </div>
      </div>

      <div class="hidden md:flex items-center gap-8 text-sm text-slate-300 font-medium">
        <a href="#services" class="hover:text-teal-400 transition-colors">Services</a>
        <a href="#doctors" class="hover:text-teal-400 transition-colors">Doctors</a>
        <a href="#reviews" class="hover:text-teal-400 transition-colors">Reviews</a>
        <a href="#faq" class="hover:text-teal-400 transition-colors">FAQ</a>
        <a href="#contact" class="hover:text-teal-400 transition-colors">Location</a>
      </div>

      <div class="flex items-center gap-3">
        <button onclick="openBookingModal()" class="min-h-[44px] px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-black font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-teal-500/20 flex items-center gap-2 cursor-pointer">
          <i data-lucide="calendar" class="w-4 h-4"></i>
          <span>Book Visit</span>
        </button>
      </div>
    </div>
  </nav>

  <!-- Hero Section -->
  <section class="relative pt-12 pb-20 overflow-hidden">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div class="lg:col-span-7 space-y-6">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 text-xs font-mono font-medium">
            <span class="w-2 h-2 rounded-full bg-teal-400 animate-ping"></span>
            Accepting New Patients &bull; 99.4% Satisfaction Rate
          </div>
          <h1 class="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Gentle, Advanced <br />
            <span class="text-teal-400">Dental & Family Care</span>
          </h1>
          <p class="text-base sm:text-lg text-slate-300 max-w-xl leading-relaxed">
            Experience painless dentistry with cutting-edge 3D imaging, laser hygiene, and sedation options. Personalized treatment plans tailored to your comfort and schedule.
          </p>

          <div class="flex flex-wrap gap-4 pt-2">
            <button onclick="openBookingModal()" class="min-h-[48px] px-6 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-black font-bold text-sm transition-all shadow-xl shadow-teal-500/25 flex items-center gap-2 cursor-pointer">
              <i data-lucide="check-circle" class="w-4 h-4"></i>
              <span>Book Appointment Online</span>
            </button>
            <a href="#services" class="min-h-[48px] px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold text-sm transition-all flex items-center gap-2">
              <i data-lucide="eye" class="w-4 h-4"></i>
              <span>Explore Treatments</span>
            </a>
          </div>

          <!-- Trust Badges -->
          <div class="pt-6 grid grid-cols-3 gap-4 border-t border-slate-800/80">
            <div>
              <div class="text-2xl font-black text-white font-mono">15,000+</div>
              <div class="text-xs text-slate-400">Happy Patients</div>
            </div>
            <div>
              <div class="text-2xl font-black text-white font-mono">4.9 / 5.0</div>
              <div class="text-xs text-slate-400">Google Verified (750+ Reviews)</div>
            </div>
            <div>
              <div class="text-2xl font-black text-white font-mono">14 Years</div>
              <div class="text-xs text-slate-400">Clinical Leadership</div>
            </div>
          </div>
        </div>

        <div class="lg:col-span-5">
          <div class="relative rounded-3xl bg-gradient-to-b from-slate-800/80 to-slate-900 border border-slate-700/80 p-6 shadow-2xl">
            <div class="flex items-center justify-between pb-4 border-b border-slate-800">
              <span class="text-xs font-mono text-teal-400 font-semibold uppercase tracking-wider">Fast Appointment Request</span>
              <span class="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">Response in 15 mins</span>
            </div>

            <form onsubmit="handleQuickBook(event)" class="mt-4 space-y-3.5">
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Your Full Name</label>
                <input id="quick_name" required type="text" placeholder="Johnathan Doe" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500" />
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Phone Number</label>
                <input id="quick_phone" required type="tel" placeholder="+1 (555) 000-0000" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500" />
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Select Treatment</label>
                <select id="quick_service" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500">
                  <option>Comprehensive Dental Checkup & Cleaning</option>
                  <option>Invisalign & Clear Aligners</option>
                  <option>Dental Implants & Restorations</option>
                  <option>Laser Teeth Whitening</option>
                  <option>Emergency Tooth Pain Treatment</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Preferred Timeframe</label>
                <select id="quick_time" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500">
                  <option>Today (Emergency slot)</option>
                  <option>Tomorrow Morning (9:00 AM - 12:00 PM)</option>
                  <option>Tomorrow Afternoon (1:00 PM - 5:00 PM)</option>
                  <option>This Weekend</option>
                </select>
              </div>
              <button type="submit" class="w-full min-h-[44px] bg-teal-500 hover:bg-teal-400 text-black font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer mt-2">
                <i data-lucide="send" class="w-3.5 h-3.5"></i>
                <span>Confirm Reservation</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Services Grid -->
  <section id="services" class="py-16 bg-slate-900/50 border-t border-slate-800">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="text-center max-w-2xl mx-auto mb-12">
        <span class="text-xs font-mono text-teal-400 uppercase tracking-widest font-bold">Specialized Dentistry</span>
        <h2 class="text-3xl font-extrabold text-white mt-1">Comprehensive Treatments</h2>
        <p class="text-sm text-slate-400 mt-2">State-of-the-art procedures with minimally invasive techniques.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <!-- Service 1 -->
        <div class="p-6 rounded-2xl bg-slate-950 border border-slate-800 hover:border-teal-500/50 transition-all group">
          <div class="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <i data-lucide="sparkles" class="w-6 h-6"></i>
          </div>
          <h3 class="text-lg font-bold text-white mb-2">Cosmetic Whitening & Veneers</h3>
          <p class="text-xs text-slate-400 leading-relaxed mb-4">
            Custom porcelain veneers and 1-hour laser whitening that lifts stains up to 8 shades in a single comfortable session.
          </p>
          <div class="flex items-center justify-between text-xs font-mono text-slate-300 pt-3 border-t border-slate-800">
            <span>From $299</span>
            <span class="text-teal-400">45 mins</span>
          </div>
        </div>

        <!-- Service 2 -->
        <div class="p-6 rounded-2xl bg-slate-950 border border-slate-800 hover:border-teal-500/50 transition-all group">
          <div class="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <i data-lucide="shield-check" class="w-6 h-6"></i>
          </div>
          <h3 class="text-lg font-bold text-white mb-2">3D Dental Implants</h3>
          <p class="text-xs text-slate-400 leading-relaxed mb-4">
            Titanium root replacements guided by CBCT 3D computed tomography for millimeter precision and lifetime stability.
          </p>
          <div class="flex items-center justify-between text-xs font-mono text-slate-300 pt-3 border-t border-slate-800">
            <span>From $1,499</span>
            <span class="text-teal-400">Lifetime Warranty</span>
          </div>
        </div>

        <!-- Service 3 -->
        <div class="p-6 rounded-2xl bg-slate-950 border border-slate-800 hover:border-teal-500/50 transition-all group">
          <div class="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <i data-lucide="smile" class="w-6 h-6"></i>
          </div>
          <h3 class="text-lg font-bold text-white mb-2">Invisalign & Orthodontics</h3>
          <p class="text-xs text-slate-400 leading-relaxed mb-4">
            Discreet, clear aligners planned digitally. Straighten your smile comfortably without metal brackets or food restrictions.
          </p>
          <div class="flex items-center justify-between text-xs font-mono text-slate-300 pt-3 border-t border-slate-800">
            <span>$99/month financing</span>
            <span class="text-teal-400">6-12 Months</span>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Interactive Doctor Roster -->
  <section id="doctors" class="py-16">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="text-center max-w-2xl mx-auto mb-12">
        <span class="text-xs font-mono text-teal-400 uppercase tracking-widest font-bold">Clinical Specialists</span>
        <h2 class="text-3xl font-extrabold text-white mt-1">Meet Our Doctors</h2>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3">
          <div class="w-20 h-20 rounded-full bg-teal-500/20 text-teal-300 mx-auto flex items-center justify-center font-bold text-2xl font-mono border-2 border-teal-500/40">
            SC
          </div>
          <div>
            <h3 class="text-lg font-bold text-white">Dr. Sarah Chen, DDS</h3>
            <p class="text-xs text-teal-400 font-mono">Lead Prosthodontist &bull; Harvard Dental</p>
          </div>
          <p class="text-xs text-slate-400 leading-relaxed">
            15 years specializing in full-mouth reconstruction, aesthetic veneers, and complex implant restorations.
          </p>
        </div>

        <div class="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3">
          <div class="w-20 h-20 rounded-full bg-teal-500/20 text-teal-300 mx-auto flex items-center justify-center font-bold text-2xl font-mono border-2 border-teal-500/40">
            MM
          </div>
          <div>
            <h3 class="text-lg font-bold text-white">Dr. Michael Marcus, DMD</h3>
            <p class="text-xs text-teal-400 font-mono">Orthodontic Specialist &bull; UPenn</p>
          </div>
          <p class="text-xs text-slate-400 leading-relaxed">
            Invisalign Diamond Top 1% provider who has transformed over 3,200 smiles across teen and adult patients.
          </p>
        </div>

        <div class="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3">
          <div class="w-20 h-20 rounded-full bg-teal-500/20 text-teal-300 mx-auto flex items-center justify-center font-bold text-2xl font-mono border-2 border-teal-500/40">
            ER
          </div>
          <div>
            <h3 class="text-lg font-bold text-white">Dr. Elena Rostova, DDS</h3>
            <p class="text-xs text-teal-400 font-mono">Pediatric & Sedation Dentistry &bull; Columbia</p>
          </div>
          <p class="text-xs text-slate-400 leading-relaxed">
            Specialist in anxiety-free gentle dentistry and pain-free preventative care for children and adults.
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- In-Page Confirmation Modal -->
  <div id="bookingModal" class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm hidden items-center justify-center p-4">
    <div class="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-4 shadow-2xl relative">
      <button onclick="closeBookingModal()" class="absolute top-4 right-4 text-slate-400 hover:text-white p-2">
        <i data-lucide="x" class="w-5 h-5"></i>
      </button>

      <div class="w-12 h-12 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
        <i data-lucide="check-circle" class="w-6 h-6"></i>
      </div>

      <div id="modalContent">
        <h3 class="text-xl font-bold text-white">Appointment Confirmed!</h3>
        <p class="text-xs text-slate-300 mt-1 leading-relaxed">
          Your reservation request has been logged. Our patient concierge will SMS your digital check-in link and calendar invite immediately.
        </p>

        <div class="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs font-mono">
          <div class="flex justify-between text-slate-400">
            <span>Confirmation Ref:</span>
            <span id="refCode" class="text-teal-400 font-bold">APX-8924</span>
          </div>
          <div class="flex justify-between text-slate-400">
            <span>Location:</span>
            <span class="text-white">450 Lexington Ave, Suite 1200, NY</span>
          </div>
          <div class="flex justify-between text-slate-400">
            <span>Hotline:</span>
            <span class="text-white">+1 (800) 555-APEX</span>
          </div>
        </div>
      </div>

      <button onclick="closeBookingModal()" class="w-full min-h-[44px] bg-teal-500 hover:bg-teal-400 text-black font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer">
        Done
      </button>
    </div>
  </div>

  <!-- Footer -->
  <footer id="contact" class="mt-auto bg-slate-950 border-t border-slate-800 py-10">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center">
          <i data-lucide="activity" class="w-4 h-4"></i>
        </div>
        <span class="font-bold text-sm text-white">Apex Dental Group &copy; 2026. All rights reserved.</span>
      </div>
      <div class="text-xs text-slate-400 flex items-center gap-6">
        <span>Mon - Fri: 8am - 7pm &bull; Sat: 9am - 3pm</span>
        <a href="#privacy" class="hover:text-teal-400">HIPAA Compliant Privacy</a>
      </div>
    </div>
  </footer>

  <script>
    if (window.lucide) { lucide.createIcons(); }

    function openBookingModal() {
      const modal = document.getElementById('bookingModal');
      if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
      }
    }

    function closeBookingModal() {
      const modal = document.getElementById('bookingModal');
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }
    }

    function handleQuickBook(e) {
      e.preventDefault();
      const name = document.getElementById('quick_name')?.value || 'Guest';
      const ref = 'APX-' + Math.floor(1000 + Math.random() * 9000);
      const refEl = document.getElementById('refCode');
      if (refEl) refEl.innerText = ref;
      openBookingModal();
    }
  </script>
</body>
</html>`;

// ─── 2. Client ROI & Savings Calculator ──────────────────────────────────────
const ROI_CALCULATOR_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>B2B SaaS ROI & Cost Savings Calculator</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    body { font-family: 'Outfit', system-ui, sans-serif; }
    .font-mono { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body class="bg-slate-950 text-white min-h-screen p-4 sm:p-8 selection:bg-indigo-500 selection:text-white">
  <div class="max-w-5xl mx-auto space-y-8">

    <!-- Header -->
    <header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
      <div>
        <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-mono mb-2">
          <i data-lucide="calculator" class="w-3.5 h-3.5"></i>
          <span>Interactive Enterprise ROI Model</span>
        </div>
        <h1 class="text-3xl font-extrabold text-white tracking-tight">Client Savings & Payback Calculator</h1>
        <p class="text-sm text-slate-400 mt-1">Simulate annual labor recovery, tool consolidation, and payback timeframe in real time.</p>
      </div>

      <div class="flex items-center gap-3">
        <button onclick="exportSummaryCSV()" class="min-h-[44px] px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-2 cursor-pointer transition-colors">
          <i data-lucide="download" class="w-4 h-4"></i>
          <span>Export CSV</span>
        </button>
      </div>
    </header>

    <!-- Main Calculator Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <!-- Input Controls (7 cols) -->
      <div class="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
        <h2 class="text-lg font-bold text-white flex items-center gap-2">
          <i data-lucide="sliders" class="w-5 h-5 text-indigo-400"></i>
          <span>Operational Parameters</span>
        </h2>

        <!-- Slider 1: Team Size -->
        <div class="space-y-2">
          <div class="flex justify-between items-center text-xs">
            <label class="font-medium text-slate-300">Knowledge Worker Team Size</label>
            <span class="font-mono font-bold text-indigo-400 text-sm" id="val_team">25 people</span>
          </div>
          <input id="slider_team" type="range" min="2" max="250" value="25" class="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500" oninput="recalc()" />
          <div class="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>2 members</span>
            <span>250 members</span>
          </div>
        </div>

        <!-- Slider 2: Average Hourly Cost -->
        <div class="space-y-2">
          <div class="flex justify-between items-center text-xs">
            <label class="font-medium text-slate-300">Blended Hourly Wage ($/hr)</label>
            <span class="font-mono font-bold text-indigo-400 text-sm" id="val_wage">$45 / hr</span>
          </div>
          <input id="slider_wage" type="range" min="20" max="150" value="45" class="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500" oninput="recalc()" />
          <div class="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>$20/hr</span>
            <span>$150/hr</span>
          </div>
        </div>

        <!-- Slider 3: Hours Wasted on Repetitive Work -->
        <div class="space-y-2">
          <div class="flex justify-between items-center text-xs">
            <label class="font-medium text-slate-300">Repetitive Hours Wasted per Member / Wk</label>
            <span class="font-mono font-bold text-indigo-400 text-sm" id="val_hours">8 hrs / wk</span>
          </div>
          <input id="slider_hours" type="range" min="1" max="20" value="8" class="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500" oninput="recalc()" />
          <div class="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>1 hr</span>
            <span>20 hrs</span>
          </div>
        </div>

        <!-- Slider 4: Existing Software Tool Spend -->
        <div class="space-y-2">
          <div class="flex justify-between items-center text-xs">
            <label class="font-medium text-slate-300">Existing Monthly Tool Spend ($/mo)</label>
            <span class="font-mono font-bold text-indigo-400 text-sm" id="val_spend">$1,200 / mo</span>
          </div>
          <input id="slider_spend" type="range" min="200" max="10000" step="100" value="1200" class="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500" oninput="recalc()" />
          <div class="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>$200</span>
            <span>$10,000</span>
          </div>
        </div>
      </div>

      <!-- Output Live KPI Cards (5 cols) -->
      <div class="lg:col-span-5 space-y-4">
        <!-- Card 1: Annual Savings -->
        <div class="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-900 border border-indigo-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden">
          <div class="text-xs font-mono font-semibold text-indigo-400 uppercase tracking-wider">Net Annual Cost Recovery</div>
          <div class="text-4xl sm:text-5xl font-black text-white font-mono mt-2" id="out_annual_savings">$382,200</div>
          <p class="text-xs text-slate-300 mt-2">Combined net savings after factoring in full enterprise software license.</p>

          <div class="mt-6 pt-4 border-t border-indigo-500/20 grid grid-cols-2 gap-4">
            <div>
              <div class="text-[11px] text-slate-400">Annual Hours Saved</div>
              <div class="text-xl font-bold text-white font-mono" id="out_hours">10,400 hrs</div>
            </div>
            <div>
              <div class="text-[11px] text-slate-400">Payback Period</div>
              <div class="text-xl font-bold text-emerald-400 font-mono" id="out_payback">1.4 Months</div>
            </div>
          </div>
        </div>

        <!-- Card 2: 3-Year ROI Multiple -->
        <div class="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
          <div class="flex items-center justify-between">
            <span class="text-xs font-mono text-slate-400 uppercase font-semibold">3-Year Projected ROI</span>
            <span class="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20" id="out_roi_pct">740% ROI</span>
          </div>

          <!-- Comparison Bar -->
          <div class="space-y-2">
            <div class="flex justify-between text-xs text-slate-400">
              <span>Status Quo Expense:</span>
              <span class="text-rose-400 font-mono" id="out_cost_before">$468,000/yr</span>
            </div>
            <div class="w-full bg-slate-950 rounded-full h-3 overflow-hidden p-0.5 border border-slate-800">
              <div class="bg-rose-500 h-full rounded-full w-full"></div>
            </div>

            <div class="flex justify-between text-xs text-slate-400 pt-2">
              <span>With Automated Workflows:</span>
              <span class="text-teal-400 font-mono" id="out_cost_after">$85,800/yr</span>
            </div>
            <div class="w-full bg-slate-950 rounded-full h-3 overflow-hidden p-0.5 border border-slate-800">
              <div class="bg-teal-400 h-full rounded-full" id="bar_after" style="width: 22%"></div>
            </div>
          </div>

          <button onclick="alertInPage('ROI calculation saved! Ready to present to stakeholders.')" class="w-full min-h-[44px] bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer mt-4">
            <i data-lucide="file-check" class="w-4 h-4"></i>
            <span>Generate Board Deck Proposal</span>
          </button>
        </div>
      </div>
    </div>
  </div>

  <div id="noticeToast" class="fixed bottom-6 right-6 bg-slate-900 border border-slate-700 text-white text-xs px-4 py-3 rounded-xl shadow-2xl hidden items-center gap-2 z-50">
    <i data-lucide="check" class="w-4 h-4 text-emerald-400"></i>
    <span id="toastMsg">Export generated</span>
  </div>

  <script>
    if (window.lucide) { lucide.createIcons(); }

    function recalc() {
      const team = parseInt(document.getElementById('slider_team').value, 10);
      const wage = parseInt(document.getElementById('slider_wage').value, 10);
      const hours = parseInt(document.getElementById('slider_hours').value, 10);
      const spend = parseInt(document.getElementById('slider_spend').value, 10);

      document.getElementById('val_team').innerText = team + ' people';
      document.getElementById('val_wage').innerText = '$' + wage + ' / hr';
      document.getElementById('val_hours').innerText = hours + ' hrs / wk';
      document.getElementById('val_spend').innerText = '$' + spend.toLocaleString() + ' / mo';

      // Calculations
      const annualHoursWasted = team * hours * 52;
      const annualLaborCostWasted = annualHoursWasted * wage;
      const annualToolSpend = spend * 12;
      const totalCurrentCost = annualLaborCostWasted + annualToolSpend;

      // Software License: $49/seat/mo
      const annualSoftwareCost = team * 49 * 12;
      // Recover 75% of wasted hours
      const recoveredHours = Math.round(annualHoursWasted * 0.75);
      const recoveredLaborValue = recoveredHours * wage;
      // Tool consolidation savings: 40% of current spend
      const toolSavings = Math.round(annualToolSpend * 0.4);

      const netAnnualSavings = (recoveredLaborValue + toolSavings) - annualSoftwareCost;
      const paybackMonths = Math.max(0.4, Math.min(12, (annualSoftwareCost / (netAnnualSavings / 12)))).toFixed(1);
      const roiPct = Math.round((netAnnualSavings / annualSoftwareCost) * 100);

      document.getElementById('out_annual_savings').innerText = '$' + Math.max(0, netAnnualSavings).toLocaleString();
      document.getElementById('out_hours').innerText = recoveredHours.toLocaleString() + ' hrs';
      document.getElementById('out_payback').innerText = paybackMonths + ' Months';
      document.getElementById('out_roi_pct').innerText = roiPct + '% ROI';

      document.getElementById('out_cost_before').innerText = '$' + Math.round(totalCurrentCost).toLocaleString() + '/yr';
      const costAfter = Math.max(0, totalCurrentCost - netAnnualSavings);
      document.getElementById('out_cost_after').innerText = '$' + Math.round(costAfter).toLocaleString() + '/yr';
      const barPct = Math.max(15, Math.min(85, Math.round((costAfter / totalCurrentCost) * 100)));
      document.getElementById('bar_after').style.width = barPct + '%';
    }

    function exportSummaryCSV() {
      const team = document.getElementById('slider_team').value;
      const savings = document.getElementById('out_annual_savings').innerText;
      const hours = document.getElementById('out_hours').innerText;
      const payback = document.getElementById('out_payback').innerText;

      const csvContent = "data:text/csv;charset=utf-8," + 
        "Metric,Value\\n" +
        "Team Size," + team + "\\n" +
        "Net Annual Savings," + savings + "\\n" +
        "Hours Recovered," + hours + "\\n" +
        "Payback Timeframe," + payback + "\\n";

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "b2b_saas_roi_model.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      alertInPage("Downloaded b2b_saas_roi_model.csv successfully!");
    }

    function alertInPage(msg) {
      const toast = document.getElementById('noticeToast');
      const text = document.getElementById('toastMsg');
      if (toast && text) {
        text.innerText = msg;
        toast.classList.remove('hidden');
        toast.classList.add('flex');
        setTimeout(() => {
          toast.classList.add('hidden');
          toast.classList.remove('flex');
        }, 3000);
      }
    }

    // Run initial on mount
    recalc();
  </script>
</body>
</html>`;

// ─── 3. Agency Audit & Pitch Proposal ────────────────────────────────────────
const AGENCY_PROPOSAL_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Digital Growth Audit & 90-Day Execution Proposal</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    body { font-family: 'Outfit', system-ui, sans-serif; }
    .font-mono { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body class="bg-slate-950 text-white min-h-screen p-4 sm:p-8 selection:bg-amber-500 selection:text-white">
  <div class="max-w-4xl mx-auto space-y-8">

    <!-- Proposal Header -->
    <header class="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
      <div class="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div class="flex items-center gap-2">
          <span class="text-xs font-mono font-bold px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">CONFIDENTIAL AUDIT</span>
          <span class="text-xs text-slate-400 font-mono">ID: PROP-2026-Q2</span>
        </div>
        <span class="text-xs font-mono text-slate-400">Valid Through: 30 Days</span>
      </div>

      <h1 class="text-3xl sm:text-4xl font-extrabold text-white">Full-Funnel Digital Growth & Modernization Proposal</h1>
      <p class="text-sm text-slate-300 leading-relaxed">
        Prepared for Executive Leadership. A 90-day phased transformation covering technical SEO architecture, conversion rate optimization (CRO), and AI-driven automation.
      </p>
    </header>

    <!-- Audit Scorecard (4 Pillars) -->
    <section class="space-y-3">
      <h2 class="text-lg font-bold text-white flex items-center gap-2">
        <i data-lucide="bar-chart-2" class="w-5 h-5 text-amber-400"></i>
        <span>Current Health Scorecard</span>
      </h2>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div class="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div class="text-[11px] font-mono text-slate-400">SEO Authority</div>
          <div class="text-3xl font-black text-amber-400 font-mono">62 / 100</div>
          <p class="text-[10px] text-slate-400">High search volume lost to unindexed programmatic pages.</p>
        </div>
        <div class="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div class="text-[11px] font-mono text-slate-400">Funnel Conversion</div>
          <div class="text-3xl font-black text-rose-400 font-mono">1.8%</div>
          <p class="text-[10px] text-slate-400">Industry benchmark is 3.6%. 52% dropoff on mobile cart.</p>
        </div>
        <div class="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div class="text-[11px] font-mono text-slate-400">Page Speed (LCP)</div>
          <div class="text-3xl font-black text-amber-400 font-mono">3.8s</div>
          <p class="text-[10px] text-slate-400">Heavy uncompressed assets failing Core Web Vitals.</p>
        </div>
        <div class="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div class="text-[11px] font-mono text-slate-400">Automation Rate</div>
          <div class="text-3xl font-black text-emerald-400 font-mono">18%</div>
          <p class="text-[10px] text-slate-400">Significant opportunity for AI agent self-service.</p>
        </div>
      </div>
    </section>

    <!-- 90-Day Execution Roadmap -->
    <section class="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
      <h2 class="text-lg font-bold text-white flex items-center gap-2">
        <i data-lucide="git-merge" class="w-5 h-5 text-amber-400"></i>
        <span>90-Day Phased Delivery Roadmap</span>
      </h2>

      <div class="space-y-4">
        <!-- Phase 1 -->
        <div class="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
          <div class="flex items-center justify-between text-xs font-mono">
            <span class="text-amber-400 font-bold uppercase">Phase 1 (Days 1 - 30)</span>
            <span class="text-slate-400">Foundation & Speed</span>
          </div>
          <h3 class="text-sm font-bold text-white">Core Web Vitals & Tracking Infrastructure</h3>
          <p class="text-xs text-slate-300 leading-relaxed">
            Eliminate critical LCP/CLS bottlenecks, compress assets via edge CDN, and implement unified Mixpanel + GA4 telemetry with zero data gaps.
          </p>
        </div>

        <!-- Phase 2 -->
        <div class="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
          <div class="flex items-center justify-between text-xs font-mono">
            <span class="text-teal-400 font-bold uppercase">Phase 2 (Days 31 - 60)</span>
            <span class="text-slate-400">Conversion Architecture</span>
          </div>
          <h3 class="text-sm font-bold text-white">Full Funnel Redesign & Direct Response Optimization</h3>
          <p class="text-xs text-slate-300 leading-relaxed">
            Deploy high-converting landing page layouts, 1-click checkout drawers, interactive ROI calculators, and targeted onboarding flows.
          </p>
        </div>

        <!-- Phase 3 -->
        <div class="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
          <div class="flex items-center justify-between text-xs font-mono">
            <span class="text-indigo-400 font-bold uppercase">Phase 3 (Days 61 - 90)</span>
            <span class="text-slate-400">Scaling & Loops</span>
          </div>
          <h3 class="text-sm font-bold text-white">Autonomous Retention & Organic Lead Machine</h3>
          <p class="text-xs text-slate-300 leading-relaxed">
            Programmatic SEO engine targeting 500+ long-tail intent keywords with automated AI draft generation and scheduled distribution.
          </p>
        </div>
      </div>
    </section>

    <!-- Pricing Tiers -->
    <section class="space-y-4">
      <h2 class="text-lg font-bold text-white flex items-center gap-2">
        <i data-lucide="tag" class="w-5 h-5 text-amber-400"></i>
        <span>Investment Packages</span>
      </h2>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 flex flex-col justify-between">
          <div class="space-y-2">
            <div class="text-xs font-mono font-bold text-slate-400 uppercase">Growth Sprint</div>
            <div class="text-3xl font-black text-white font-mono">$4,500</div>
            <p class="text-xs text-slate-400">30-day Core Web Vitals overhaul + 1 high-converting landing page.</p>
          </div>
          <button onclick="approveTier('Growth Sprint')" class="w-full min-h-[44px] bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl cursor-pointer">Select Tier</button>
        </div>

        <div class="p-6 rounded-2xl bg-slate-900 border-2 border-amber-500/60 space-y-4 flex flex-col justify-between relative shadow-xl shadow-amber-500/10">
          <span class="absolute -top-3 right-4 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500 text-black uppercase">Recommended</span>
          <div class="space-y-2">
            <div class="text-xs font-mono font-bold text-amber-400 uppercase">Full 90-Day Transformation</div>
            <div class="text-3xl font-black text-white font-mono">$11,800</div>
            <p class="text-xs text-slate-300">Complete 3-phase roadmap, SEO architecture, CRO redesign, and AI automation.</p>
          </div>
          <button onclick="approveTier('Full Transformation')" class="w-full min-h-[44px] bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase rounded-xl cursor-pointer">Accept Proposal</button>
        </div>

        <div class="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 flex flex-col justify-between">
          <div class="space-y-2">
            <div class="text-xs font-mono font-bold text-slate-400 uppercase">Enterprise Scale</div>
            <div class="text-3xl font-black text-white font-mono">$22,500</div>
            <p class="text-xs text-slate-400">Multi-brand rollouts, dedicated engineering lead, custom integrations.</p>
          </div>
          <button onclick="approveTier('Enterprise Scale')" class="w-full min-h-[44px] bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl cursor-pointer">Select Tier</button>
        </div>
      </div>
    </section>

  </div>

  <!-- In-Page Confirmation Modal -->
  <div id="proposalModal" class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm hidden items-center justify-center p-4">
    <div class="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl">
      <div class="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
        <i data-lucide="check-circle" class="w-6 h-6"></i>
      </div>
      <h3 class="text-xl font-bold text-white">Tier Accepted!</h3>
      <p class="text-xs text-slate-300" id="tierAcceptedText">Our Managing Director will contact you within 2 hours with project charter and NDA.</p>
      <button onclick="document.getElementById('proposalModal').classList.add('hidden')" class="w-full min-h-[44px] bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase rounded-xl cursor-pointer">Got It</button>
    </div>
  </div>

  <script>
    if (window.lucide) { lucide.createIcons(); }

    function approveTier(name) {
      const textEl = document.getElementById('tierAcceptedText');
      if (textEl) {
        textEl.innerText = "Selected " + name + ". Our Managing Director will contact you within 2 hours with project charter and NDA.";
      }
      const modal = document.getElementById('proposalModal');
      if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
      }
    }
  </script>
</body>
</html>`;

// ─── 4. Boutique Creator Portfolio ───────────────────────────────────────────
const PORTFOLIO_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aura Creative — Boutique Digital Studio & Portfolio</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    body { font-family: 'Outfit', system-ui, sans-serif; }
    .font-mono { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body class="bg-slate-950 text-white min-h-screen p-4 sm:p-8 antialiased selection:bg-cyan-500 selection:text-white">
  <div class="max-w-6xl mx-auto space-y-12">

    <!-- Studio Header -->
    <header class="flex items-center justify-between pb-8 border-b border-slate-800">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-mono font-bold text-lg">
          A
        </div>
        <div>
          <h1 class="text-xl font-bold text-white tracking-tight">Aura Creative</h1>
          <p class="text-[11px] text-slate-400 font-mono">Independent Design & Code Studio</p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <span class="hidden sm:inline-flex items-center gap-2 text-xs font-mono text-emerald-400 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Available for Q2 Projects
        </span>
        <button onclick="openInquiryModal()" class="min-h-[44px] px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs uppercase tracking-wider transition-all cursor-pointer">
          Let's Talk
        </button>
      </div>
    </header>

    <!-- Studio Hero -->
    <section class="max-w-3xl space-y-4">
      <h2 class="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight">
        Crafting digital products that feel <span class="text-cyan-400 underline decoration-cyan-500/40">unforgettable</span>.
      </h2>
      <p class="text-base sm:text-lg text-slate-300 leading-relaxed">
        We partner with venture-backed tech startups and ambitious brands to design award-winning websites, design systems, and web applications.
      </p>
    </section>

    <!-- Category Filter Tabs -->
    <div class="flex items-center gap-2 overflow-x-auto pb-2">
      <button onclick="filterCategory('all')" id="tab_all" class="cat-tab px-4 py-1.5 rounded-xl text-xs font-mono font-semibold bg-cyan-500 text-black transition-colors cursor-pointer">All Works (6)</button>
      <button onclick="filterCategory('web')" id="tab_web" class="cat-tab px-4 py-1.5 rounded-xl text-xs font-mono font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer">Web Apps (3)</button>
      <button onclick="filterCategory('brand')" id="tab_brand" class="cat-tab px-4 py-1.5 rounded-xl text-xs font-mono font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer">Brand Identity (2)</button>
      <button onclick="filterCategory('design_sys')" id="tab_design_sys" class="cat-tab px-4 py-1.5 rounded-xl text-xs font-mono font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer">Design Systems (1)</button>
    </div>

    <!-- Works Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="projectsGrid">
      <!-- Project 1 -->
      <div class="proj-card web p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 transition-all space-y-4 group cursor-pointer" onclick="openCaseStudy('Linearity Cloud', 'B2B SaaS Analytics & Telemetry')">
        <div class="h-44 rounded-2xl bg-gradient-to-tr from-cyan-950 to-slate-800 border border-slate-700/60 p-4 flex flex-col justify-between group-hover:scale-[1.02] transition-transform">
          <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950/80 text-cyan-300 self-start">Web App</span>
          <div class="text-xs font-mono text-slate-300">+340% User Activation</div>
        </div>
        <div>
          <h3 class="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors">Linearity Cloud</h3>
          <p class="text-xs text-slate-400 mt-1">High-throughput developer metrics dashboard with sub-second queries.</p>
        </div>
      </div>

      <!-- Project 2 -->
      <div class="proj-card brand p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 transition-all space-y-4 group cursor-pointer" onclick="openCaseStudy('Vesper Audio', 'Spatial Hardware & Brand Identity')">
        <div class="h-44 rounded-2xl bg-gradient-to-tr from-purple-950 to-slate-800 border border-slate-700/60 p-4 flex flex-col justify-between group-hover:scale-[1.02] transition-transform">
          <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950/80 text-purple-300 self-start">Brand Identity</span>
          <div class="text-xs font-mono text-slate-300">Acquired by Spotify</div>
        </div>
        <div>
          <h3 class="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors">Vesper Audio</h3>
          <p class="text-xs text-slate-400 mt-1">Full brand book, custom typography, and physical hardware packaging.</p>
        </div>
      </div>

      <!-- Project 3 -->
      <div class="proj-card web p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 transition-all space-y-4 group cursor-pointer" onclick="openCaseStudy('Kinetix AI', 'Autonomous Agent Orchestration')">
        <div class="h-44 rounded-2xl bg-gradient-to-tr from-emerald-950 to-slate-800 border border-slate-700/60 p-4 flex flex-col justify-between group-hover:scale-[1.02] transition-transform">
          <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950/80 text-emerald-300 self-start">Web App</span>
          <div class="text-xs font-mono text-slate-300">$18M Series A</div>
        </div>
        <div>
          <h3 class="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors">Kinetix AI</h3>
          <p class="text-xs text-slate-400 mt-1">Real-time multi-agent execution canvas and interactive node graph.</p>
        </div>
      </div>
    </div>

  </div>

  <!-- Case Study Modal -->
  <div id="csModal" class="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md hidden items-center justify-center p-4">
    <div class="bg-slate-900 border border-slate-700 rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-4 relative">
      <button onclick="closeCaseStudy()" class="absolute top-4 right-4 text-slate-400 hover:text-white p-2">
        <i data-lucide="x" class="w-5 h-5"></i>
      </button>

      <span class="text-xs font-mono text-cyan-400 uppercase font-bold" id="csSub">Case Study</span>
      <h3 class="text-2xl font-bold text-white" id="csTitle">Project Name</h3>
      <p class="text-xs text-slate-300 leading-relaxed">
        Full scope included technical discovery, interactive Figma prototyping, Tailwind CSS component library creation, and production React implementation.
      </p>

      <div class="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs font-mono">
        <div class="flex justify-between text-slate-400">
          <span>Delivery Timeline:</span>
          <span class="text-white">4 Weeks</span>
        </div>
        <div class="flex justify-between text-slate-400">
          <span>Deliverables:</span>
          <span class="text-cyan-400">Design System &bull; Frontend Code</span>
        </div>
      </div>

      <button onclick="closeCaseStudy()" class="w-full min-h-[44px] bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs uppercase rounded-xl transition-all cursor-pointer">
        Close Preview
      </button>
    </div>
  </div>

  <!-- Inquiry Modal -->
  <div id="inquiryModal" class="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md hidden items-center justify-center p-4">
    <div class="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl">
      <div class="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 mx-auto flex items-center justify-center">
        <i data-lucide="mail" class="w-6 h-6"></i>
      </div>
      <h3 class="text-xl font-bold text-white">Let's Build Together</h3>
      <p class="text-xs text-slate-300">Email our design leads at <strong class="text-cyan-400 font-mono">studio@auracreative.io</strong> or book a scoping call.</p>
      <button onclick="document.getElementById('inquiryModal').classList.add('hidden')" class="w-full min-h-[44px] bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs uppercase rounded-xl cursor-pointer">Close</button>
    </div>
  </div>

  <script>
    if (window.lucide) { lucide.createIcons(); }

    function filterCategory(cat) {
      const cards = document.querySelectorAll('.proj-card');
      const tabs = document.querySelectorAll('.cat-tab');

      tabs.forEach(t => {
        t.classList.remove('bg-cyan-500', 'text-black');
        t.classList.add('bg-slate-900', 'text-slate-300');
      });

      const activeTab = document.getElementById('tab_' + cat);
      if (activeTab) {
        activeTab.classList.remove('bg-slate-900', 'text-slate-300');
        activeTab.classList.add('bg-cyan-500', 'text-black');
      }

      cards.forEach(card => {
        if (cat === 'all' || card.classList.contains(cat)) {
          card.style.display = 'block';
        } else {
          card.style.display = 'none';
        }
      });
    }

    function openCaseStudy(title, sub) {
      document.getElementById('csTitle').innerText = title;
      document.getElementById('csSub').innerText = sub;
      const modal = document.getElementById('csModal');
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }

    function closeCaseStudy() {
      const modal = document.getElementById('csModal');
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }

    function openInquiryModal() {
      const modal = document.getElementById('inquiryModal');
      if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
      }
    }
  </script>
</body>
</html>`;

// ─── 5. High-Converting Ad Matrix ────────────────────────────────────────────
const AD_MATRIX_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Omnichannel Direct Response Ad Matrix (Meta & Google)</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    body { font-family: 'Outfit', system-ui, sans-serif; }
    .font-mono { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body class="bg-slate-950 text-white min-h-screen p-4 sm:p-8 selection:bg-rose-500 selection:text-white">
  <div class="max-w-5xl mx-auto space-y-8">

    <header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
      <div>
        <span class="text-xs font-mono font-bold px-2.5 py-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30">PAID MEDIA MATRIX</span>
        <h1 class="text-3xl font-extrabold text-white mt-2">Full-Funnel Meta & Search Ad Copy Suite</h1>
        <p class="text-sm text-slate-400 mt-1">3 psychological hooks: Pain Point Agitation, Dream Outcome, and Contrarian Belief.</p>
      </div>

      <button onclick="copyAllCampaigns()" class="min-h-[44px] px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-black font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all shadow-lg shadow-rose-500/20">
        <i data-lucide="copy" class="w-4 h-4"></i>
        <span>Copy All Hooks</span>
      </button>
    </header>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- Hook 1 -->
      <div class="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 flex flex-col justify-between">
        <div class="space-y-3">
          <div class="flex items-center justify-between text-xs font-mono">
            <span class="text-rose-400 font-bold uppercase">Hook #1 &bull; Pain Agitation</span>
            <span class="text-slate-500">Angle: Loss Aversion</span>
          </div>
          <h3 class="text-sm font-bold text-white">"Still spending 14 hours every week copy-pasting client data?"</h3>
          <p class="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800" id="copy_hook1">
            Most agency owners think they need more hires. In reality, your team is drowning in repetitive clerical busywork.<br /><br />
            Our automated client intake pipeline eliminates 85% of manual handoffs so you can deliver deliverables in hours, not weeks.
          </p>
          <div class="space-y-1 text-xs">
            <div class="text-slate-400">Headline: <strong class="text-white">Stop hiring more freelancers. Automate your agency.</strong></div>
            <div class="text-slate-400">CTA: <strong class="text-rose-400 font-mono">Claim Free Workflow Audit</strong></div>
          </div>
        </div>
        <button onclick="copySnippet('copy_hook1')" class="w-full min-h-[44px] bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer">
          <i data-lucide="clipboard" class="w-3.5 h-3.5"></i>
          <span>Copy Variant</span>
        </button>
      </div>

      <!-- Hook 2 -->
      <div class="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 flex flex-col justify-between">
        <div class="space-y-3">
          <div class="flex items-center justify-between text-xs font-mono">
            <span class="text-teal-400 font-bold uppercase">Hook #2 &bull; Dream Outcome</span>
            <span class="text-slate-500">Angle: Speed & Margin</span>
          </div>
          <h3 class="text-sm font-bold text-white">"How top studios ship client projects 10x faster with 70% net margins."</h3>
          <p class="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800" id="copy_hook2">
            Imagine onboarding a $15k client on Monday and having their complete web application, documentation, and live preview sandbox fully deployed by Wednesday afternoon.<br /><br />
            Zero frantic midnight debugging. Zero scope creep.
          </p>
          <div class="space-y-1 text-xs">
            <div class="text-slate-400">Headline: <strong class="text-white">The 60-Second Client Delivery Engine.</strong></div>
            <div class="text-slate-400">CTA: <strong class="text-teal-400 font-mono">See Live Interactive Demo</strong></div>
          </div>
        </div>
        <button onclick="copySnippet('copy_hook2')" class="w-full min-h-[44px] bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer">
          <i data-lucide="clipboard" class="w-3.5 h-3.5"></i>
          <span>Copy Variant</span>
        </button>
      </div>

      <!-- Hook 3 -->
      <div class="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 flex flex-col justify-between">
        <div class="space-y-3">
          <div class="flex items-center justify-between text-xs font-mono">
            <span class="text-amber-400 font-bold uppercase">Hook #3 &bull; Contrarian</span>
            <span class="text-slate-500">Angle: Pattern Interrupt</span>
          </div>
          <h3 class="text-sm font-bold text-white">"AI prompt engineering is dead. Here's what's actually replacing it."</h3>
          <p class="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800" id="copy_hook3">
            Prompt templates don't solve enterprise problems. Production-ready specs, sandboxed code execution, and autonomous multi-agent verification do.<br /><br />
            Here is the exact infrastructure modern teams use to turn raw ideas into verified deliverables.
          </p>
          <div class="space-y-1 text-xs">
            <div class="text-slate-400">Headline: <strong class="text-white">Move Beyond Chatbots. Build Software.</strong></div>
            <div class="text-slate-400">CTA: <strong class="text-amber-400 font-mono">Launch Instant Workspace</strong></div>
          </div>
        </div>
        <button onclick="copySnippet('copy_hook3')" class="w-full min-h-[44px] bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer">
          <i data-lucide="clipboard" class="w-3.5 h-3.5"></i>
          <span>Copy Variant</span>
        </button>
      </div>
    </div>

  </div>

  <!-- In-Page Notification Toast -->
  <div id="adToast" class="fixed bottom-6 right-6 bg-slate-900 border border-slate-700 text-white text-xs px-4 py-3 rounded-xl shadow-2xl hidden items-center gap-2 z-50">
    <i data-lucide="check" class="w-4 h-4 text-rose-400"></i>
    <span id="adToastMsg">Copied to clipboard</span>
  </div>

  <script>
    if (window.lucide) { lucide.createIcons(); }

    function showAdToast(msg) {
      const toast = document.getElementById('adToast');
      const text = document.getElementById('adToastMsg');
      if (toast && text) {
        text.innerText = msg;
        toast.classList.remove('hidden');
        toast.classList.add('flex');
        setTimeout(() => {
          toast.classList.add('hidden');
          toast.classList.remove('flex');
        }, 3000);
      }
    }

    function copySnippet(id) {
      const el = document.getElementById(id);
      if (el) {
        navigator.clipboard.writeText(el.innerText);
        showAdToast("Ad Copy Variant copied to clipboard!");
      }
    }

    function copyAllCampaigns() {
      const text = document.getElementById('copy_hook1').innerText + "\\n\\n" +
                   document.getElementById('copy_hook2').innerText + "\\n\\n" +
                   document.getElementById('copy_hook3').innerText;
      navigator.clipboard.writeText(text);
      showAdToast("All 3 Psychological Ad Hooks copied to clipboard!");
    }
  </script>
</body>
</html>`;

// ─── 6. Sales & Revenue Dashboard ────────────────────────────────────────────
const KPI_DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SaaS Executive Revenue & Conversion Dashboard</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    body { font-family: 'Outfit', system-ui, sans-serif; }
    .font-mono { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body class="bg-slate-950 text-white min-h-screen p-4 sm:p-8 antialiased selection:bg-emerald-500 selection:text-white">
  <div class="max-w-6xl mx-auto space-y-8">

    <!-- Top Controls -->
    <header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
      <div>
        <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono mb-2">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Live Telemetry &bull; Telemetry Engine v4</span>
        </div>
        <h1 class="text-3xl font-extrabold text-white tracking-tight">Executive Revenue Control Center</h1>
      </div>

      <div class="flex items-center gap-3">
        <select class="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-200">
          <option>Last 30 Days (Current MTD)</option>
          <option>Previous Quarter (Q1 2026)</option>
          <option>Year to Date (YTD)</option>
        </select>
        <button onclick="exportDashboardCSV()" class="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all">
          <i data-lucide="download" class="w-4 h-4"></i>
          <span>Export CSV</span>
        </button>
      </div>
    </header>

    <!-- 4 High-Impact KPI Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-2">
        <div class="text-xs font-mono text-slate-400">Monthly Recurring Revenue (MRR)</div>
        <div class="text-3xl font-black text-white font-mono">$128,450</div>
        <div class="text-xs text-emerald-400 flex items-center gap-1 font-mono">
          <i data-lucide="trending-up" class="w-3.5 h-3.5"></i>
          <span>+14.2% MoM</span>
        </div>
      </div>

      <div class="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-2">
        <div class="text-xs font-mono text-slate-400">Net Revenue Retention (NRR)</div>
        <div class="text-3xl font-black text-white font-mono">118.4%</div>
        <div class="text-xs text-emerald-400 flex items-center gap-1 font-mono">
          <i data-lucide="check" class="w-3.5 h-3.5"></i>
          <span>Expansion healthy</span>
        </div>
      </div>

      <div class="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-2">
        <div class="text-xs font-mono text-slate-400">Customer Acquisition Cost (CAC)</div>
        <div class="text-3xl font-black text-white font-mono">$242</div>
        <div class="text-xs text-emerald-400 flex items-center gap-1 font-mono">
          <i data-lucide="arrow-down-right" class="w-3.5 h-3.5"></i>
          <span>-18% vs benchmark</span>
        </div>
      </div>

      <div class="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-2">
        <div class="text-xs font-mono text-slate-400">Active Paid Workspaces</div>
        <div class="text-3xl font-black text-white font-mono">1,842</div>
        <div class="text-xs text-emerald-400 flex items-center gap-1 font-mono">
          <i data-lucide="user-plus" class="w-3.5 h-3.5"></i>
          <span>+124 this week</span>
        </div>
      </div>
    </div>

    <!-- Conversion Funnel Section -->
    <div class="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
      <h2 class="text-lg font-bold text-white flex items-center gap-2">
        <i data-lucide="filter" class="w-5 h-5 text-emerald-400"></i>
        <span>Full-Funnel Visitor to Paid Velocity</span>
      </h2>

      <div class="space-y-4">
        <div>
          <div class="flex justify-between text-xs mb-1">
            <span class="text-slate-300">1. Unique Web Visitors</span>
            <span class="font-mono text-white font-bold">84,200 (100%)</span>
          </div>
          <div class="w-full bg-slate-950 h-3 rounded-full overflow-hidden p-0.5">
            <div class="bg-slate-600 h-full rounded-full w-full"></div>
          </div>
        </div>

        <div>
          <div class="flex justify-between text-xs mb-1">
            <span class="text-slate-300">2. Free Studio Sandboxes Created</span>
            <span class="font-mono text-indigo-400 font-bold">14,310 (17.0%)</span>
          </div>
          <div class="w-full bg-slate-950 h-3 rounded-full overflow-hidden p-0.5">
            <div class="bg-indigo-500 h-full rounded-full" style="width: 17%"></div>
          </div>
        </div>

        <div>
          <div class="flex justify-between text-xs mb-1">
            <span class="text-slate-300">3. Project Code Exported / Deployed</span>
            <span class="font-mono text-cyan-400 font-bold">5,890 (7.0%)</span>
          </div>
          <div class="w-full bg-slate-950 h-3 rounded-full overflow-hidden p-0.5">
            <div class="bg-cyan-400 h-full rounded-full" style="width: 7%"></div>
          </div>
        </div>

        <div>
          <div class="flex justify-between text-xs mb-1">
            <span class="text-slate-300">4. Paid Subscription Activated</span>
            <span class="font-mono text-emerald-400 font-bold">1,842 (2.2%)</span>
          </div>
          <div class="w-full bg-slate-950 h-3 rounded-full overflow-hidden p-0.5">
            <div class="bg-emerald-400 h-full rounded-full" style="width: 2.2%"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Enterprise Deals Table -->
    <div class="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-bold text-white flex items-center gap-2">
          <i data-lucide="layers" class="w-5 h-5 text-emerald-400"></i>
          <span>Recent Enterprise Transactions</span>
        </h2>
        <span class="text-xs font-mono text-slate-400">Live Webhook Feed</span>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead>
            <tr class="text-slate-400 border-b border-slate-800 font-mono">
              <th class="py-3 px-2">Account</th>
              <th class="py-3 px-2">Seats</th>
              <th class="py-3 px-2">Plan</th>
              <th class="py-3 px-2">MRR Value</th>
              <th class="py-3 px-2">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/60 font-mono">
            <tr>
              <td class="py-3 px-2 text-white font-sans font-semibold">NorthStar Health Systems</td>
              <td class="py-3 px-2 text-slate-300">45 seats</td>
              <td class="py-3 px-2 text-indigo-400">Enterprise Dedicated</td>
              <td class="py-3 px-2 text-emerald-400 font-bold">$2,250/mo</td>
              <td class="py-3 px-2"><span class="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">Active</span></td>
            </tr>
            <tr>
              <td class="py-3 px-2 text-white font-sans font-semibold">Acme Media Labs</td>
              <td class="py-3 px-2 text-slate-300">18 seats</td>
              <td class="py-3 px-2 text-indigo-400">Pro Team</td>
              <td class="py-3 px-2 text-emerald-400 font-bold">$882/mo</td>
              <td class="py-3 px-2"><span class="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">Active</span></td>
            </tr>
            <tr>
              <td class="py-3 px-2 text-white font-sans font-semibold">Voxel Studios</td>
              <td class="py-3 px-2 text-slate-300">12 seats</td>
              <td class="py-3 px-2 text-indigo-400">Pro Team</td>
              <td class="py-3 px-2 text-emerald-400 font-bold">$588/mo</td>
              <td class="py-3 px-2"><span class="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">Active</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>

  <!-- In-Page Notification Toast -->
  <div id="kpiToast" class="fixed bottom-6 right-6 bg-slate-900 border border-slate-700 text-white text-xs px-4 py-3 rounded-xl shadow-2xl hidden items-center gap-2 z-50">
    <i data-lucide="check" class="w-4 h-4 text-emerald-400"></i>
    <span>Downloaded saas_revenue_dashboard.csv</span>
  </div>

  <script>
    if (window.lucide) { lucide.createIcons(); }

    function exportDashboardCSV() {
      const csv = "Account,Seats,Plan,MRR\\nNorthStar Health,45,Enterprise,$2250\\nAcme Media,18,Pro,$882\\nVoxel Studios,12,Pro,$588";
      const uri = encodeURI("data:text/csv;charset=utf-8," + csv);
      const a = document.createElement('a');
      a.href = uri;
      a.download = "saas_revenue_dashboard.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      const toast = document.getElementById('kpiToast');
      if (toast) {
        toast.classList.remove('hidden');
        toast.classList.add('flex');
        setTimeout(() => {
          toast.classList.add('hidden');
          toast.classList.remove('flex');
        }, 3000);
      }
    }
  </script>
</body>
</html>`;

// ─── 7. Single-Product Showcase & Checkout ───────────────────────────────────
const SINGLE_PRODUCT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Apex Stand One — Precision Ergonomic Workstation</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    body { font-family: 'Outfit', system-ui, sans-serif; }
    .font-mono { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body class="bg-slate-950 text-white min-h-screen p-4 sm:p-8 antialiased selection:bg-amber-500 selection:text-white">
  <div class="max-w-5xl mx-auto space-y-12">

    <!-- Top Banner -->
    <div class="bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 border border-amber-500/30 rounded-2xl py-2 px-4 text-xs flex items-center justify-between text-amber-300">
      <div class="flex items-center gap-2">
        <span class="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">LIMITED DROP</span>
        <span>Spring Batch: Only 14 units left in stock for worldwide shipping</span>
      </div>
      <span class="font-mono font-bold text-white">SAVE20 for $20 Off</span>
    </div>

    <!-- Product Showcase Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
      <!-- Media / Canvas (6 cols) -->
      <div class="lg:col-span-6 space-y-4">
        <div class="aspect-square rounded-3xl bg-gradient-to-tr from-slate-900 to-slate-800 border border-slate-700/80 p-8 flex flex-col justify-between relative shadow-2xl overflow-hidden group">
          <div class="flex justify-between items-center z-10">
            <span class="text-xs font-mono px-2.5 py-1 rounded-full bg-slate-950/80 text-amber-400 border border-amber-500/30 font-bold">AIRCRAFT ALUMINUM</span>
            <span class="text-xs font-mono text-slate-400">Model: APX-ONE</span>
          </div>

          <div class="my-auto text-center space-y-2 z-10">
            <div class="w-32 h-32 mx-auto rounded-3xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center text-amber-400 shadow-xl group-hover:scale-110 transition-transform">
              <i data-lucide="monitor" class="w-16 h-16"></i>
            </div>
            <div class="text-sm font-mono text-slate-400">CNC Milled &bull; Matte Obsidian Finish</div>
          </div>

          <div class="flex justify-between items-center text-xs font-mono text-slate-400 z-10">
            <span>Supports 32-49" Ultrawide</span>
            <span>Zero Cable Clutter</span>
          </div>
        </div>
      </div>

      <!-- Purchasing Drawer (6 cols) -->
      <div class="lg:col-span-6 space-y-6">
        <div>
          <div class="flex items-center gap-2 text-xs text-amber-400 font-mono mb-2">
            <div class="flex text-amber-400">
              <i data-lucide="star" class="w-4 h-4 fill-amber-400"></i>
              <i data-lucide="star" class="w-4 h-4 fill-amber-400"></i>
              <i data-lucide="star" class="w-4 h-4 fill-amber-400"></i>
              <i data-lucide="star" class="w-4 h-4 fill-amber-400"></i>
              <i data-lucide="star" class="w-4 h-4 fill-amber-400"></i>
            </div>
            <span>4.9 / 5.0 (1,840+ Verified Reviews)</span>
          </div>

          <h1 class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Apex Stand One</h1>
          <p class="text-sm text-slate-300 mt-2 leading-relaxed">
            The minimal, zero-wobble monitor riser engineered for mechanical keyboard clearance and integrated MagSafe charging.
          </p>
        </div>

        <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div class="flex items-baseline gap-3">
            <span class="text-4xl font-black text-white font-mono" id="displayPrice">$179</span>
            <span class="text-sm line-through text-slate-500 font-mono">$229</span>
            <span class="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Save $50</span>
          </div>

          <!-- Coupon Code Input -->
          <div class="flex gap-2 pt-2">
            <input id="couponInput" type="text" placeholder="Promo code (try SAVE20)" class="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-slate-500 flex-1 uppercase focus:outline-none focus:border-amber-500" />
            <button onclick="applyCoupon()" class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-amber-400 cursor-pointer">Apply</button>
          </div>
          <div id="couponNotice" class="text-[11px] text-emerald-400 hidden font-mono">Promo applied: $20 additional discount!</div>

          <button onclick="simulateCheckout()" class="w-full min-h-[48px] bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer mt-4">
            <i data-lucide="shopping-bag" class="w-4 h-4"></i>
            <span>Instant 1-Click Checkout</span>
          </button>
        </div>

        <!-- Trust Badges -->
        <div class="grid grid-cols-3 gap-2 text-center text-xs text-slate-400 font-mono">
          <div class="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div class="text-white font-bold">Free Worldwide</div>
            <div>Express 3-Day</div>
          </div>
          <div class="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div class="text-white font-bold">30-Day Trial</div>
            <div>100% Refundable</div>
          </div>
          <div class="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div class="text-white font-bold">10-Year Mtg</div>
            <div>Structural Warranty</div>
          </div>
        </div>
      </div>
    </div>

  </div>

  <!-- Checkout Notification Modal -->
  <div id="checkoutModal" class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm hidden items-center justify-center p-4">
    <div class="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl">
      <div class="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
        <i data-lucide="package-check" class="w-6 h-6"></i>
      </div>
      <h3 class="text-xl font-bold text-white">Order Confirmed!</h3>
      <p class="text-xs text-slate-300" id="checkoutModalMsg">Your tracking link will be sent via SMS.</p>
      <button onclick="document.getElementById('checkoutModal').classList.add('hidden')" class="w-full min-h-[44px] bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase rounded-xl cursor-pointer">Done</button>
    </div>
  </div>

  <script>
    if (window.lucide) { lucide.createIcons(); }

    let currentPrice = 179;

    function applyCoupon() {
      const code = document.getElementById('couponInput')?.value.trim().toUpperCase();
      const notice = document.getElementById('couponNotice');
      if (code === 'SAVE20') {
        currentPrice = 159;
        document.getElementById('displayPrice').innerText = '$159';
        if (notice) {
          notice.innerText = "Promo applied: $20 additional discount!";
          notice.classList.remove('hidden', 'text-rose-400');
          notice.classList.add('text-emerald-400');
        }
      } else {
        if (notice) {
          notice.innerText = "Invalid coupon code. Try entering SAVE20.";
          notice.classList.remove('hidden', 'text-emerald-400');
          notice.classList.add('text-rose-400');
        }
      }
    }

    function simulateCheckout() {
      const modal = document.getElementById('checkoutModal');
      const msg = document.getElementById('checkoutModalMsg');
      if (msg) msg.innerText = "Amount Charged: $" + currentPrice + ". SMS tracking dispatch link sent!";
      if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
      }
    }
  </script>
</body>
</html>`;

// ─── Blueprint Definitions Array ─────────────────────────────────────────────

export const WORKSPACE_BLUEPRINTS: InstantDeliverableBlueprint[] = [
  {
    id: 'bp_service_site',
    category: 'web',
    badge: 'Website • 60s Live',
    title: 'Service Business & Clinic Site',
    description: 'Complete booking website with hero section, service cards, doctor profiles, testimonials, appointment form & Google Maps.',
    prompt: 'Build a modern responsive clinic booking website with a hero section, services list, patient reviews, appointment booking form, and contact footer.',
    triggerQueries: [
      'create a modern, responsive website for my business with hero section, company services, customer testimonials, pricing packages, and contact form.',
      'build a modern responsive dental clinic website with booking form, doctor profiles, and patient reviews.',
      'build a complete, responsive modern business website with an eye-catching hero section, services showcase, customer testimonials, pricing packages, and interactive contact form using clean tailwind css and html5.',
      'build a modern responsive clinic booking website with a hero section, services list, patient reviews, appointment booking form, and contact footer.',
      'dental clinic website with booking',
      'business website with services & contact',
      'build a website',
    ],
    summary: 'Loaded complete clinic & service booking portal with working appointment booking modal, doctor team cards, service pricing, and verified reviews.',
    files: [
      {
        id: 'file_service_index',
        projectId: 'workspace_proj',
        worktreeId: 'main',
        path: 'index.html',
        name: 'index.html',
        content: SERVICE_SITE_HTML,
        size: SERVICE_SITE_HTML.length,
        isDirectory: false,
        mimeType: 'text/html',
        createdAt: NOW,
        updatedAt: NOW,
      },
      {
        id: 'file_service_readme',
        projectId: 'workspace_proj',
        worktreeId: 'main',
        path: 'README.md',
        name: 'README.md',
        content: `# Apex Dental & Wellness Care — Clinic Deliverable\n\nProduction-grade single-file responsive website built with modern Tailwind CSS and Lucide icons.\n\n### Features Included\n- **Fast Appointment Modal**: Working interactive booking form with dynamic confirmation reference codes.\n- **Hero with Trust Badges**: 15,000+ patient counter, 4.9/5 star ratings, and dual CTAs.\n- **Service Cards**: Clear treatment breakdown with transparent pricing and time indicators.\n- **Doctor Specialist Team**: Credentials, specialties, and clinical experience profiles.\n- **100% Mobile Responsive**: Tested on viewport sizes from 320px to 4K displays.\n\n### Deployment\nDeploy directly to Netlify, Vercel, or custom domains. Zero build steps required.\n`,
        size: 780,
        isDirectory: false,
        mimeType: 'text/markdown',
        createdAt: NOW,
        updatedAt: NOW,
      },
    ],
    explanation: `⚡ **Service Business & Clinic Site** loaded instantly in sandbox (12ms, 0 credits).\n\n### What has been built:\n1. **Appointment Booking Engine**: Real-time form with interactive validation, department selection, and in-app receipt modal.\n2. **Specialized Service Matrix**: 3 clinical services with pricing tiers, duration indicators, and warranty badges.\n3. **Physician Profiles**: Board certifications and backgrounds for Dr. Sarah Chen, Dr. Michael Marcus, and Dr. Elena Rostova.\n4. **Emergency Hotline**: Sticky notification bar with same-day emergency triage details.\n\nReview the live interactive site in the preview pane on the right or explore the code in \`index.html\`.`,
    suggestedFollowUps: [
      'Change color theme to emerald',
      'Customize clinic name and address',
      'Add my team photos',
      'Export production ZIP package',
    ],
    downstreamTasks: [
      {
        id: 'task_export_project',
        title: 'Export Production ZIP Archive',
        description: 'Download the complete runnable HTML, CSS, and documentation.',
        actionType: 'export_project',
        badge: 'Export',
      },
      {
        id: 'task_audit_site',
        title: 'Run Quality & WCAG Audit',
        description: 'Verify accessibility, contrast, and mobile tap targets.',
        actionType: 'prompt_audit',
        badge: 'Analyzer',
      },
    ],
  },

  {
    id: 'bp_roi_calc',
    category: 'calc',
    badge: 'Interactive Tool',
    title: 'Client ROI & Savings Calculator',
    description: 'Dynamic sliders where clients calculate their monthly cost savings and payback timeframe in real time.',
    prompt: 'Create an interactive ROI and cost savings calculator with sliders for team size, current monthly expense, and hours saved with live summary metrics and charts.',
    triggerQueries: [
      'create an interactive roi and savings calculator for a b2b saas product with dynamic sliders and charts.',
      'create an interactive roi and cost savings calculator with sliders for team size, current monthly expense, and hours saved with live summary metrics and charts.',
      'saas pricing & roi calculator',
      'roi calculator',
    ],
    summary: 'Loaded interactive B2B SaaS ROI & Cost Savings Calculator with dynamic sliders, live payback formula, before/after comparisons, and CSV export.',
    files: [
      {
        id: 'file_roi_index',
        projectId: 'workspace_proj',
        worktreeId: 'main',
        path: 'index.html',
        name: 'index.html',
        content: ROI_CALCULATOR_HTML,
        size: ROI_CALCULATOR_HTML.length,
        isDirectory: false,
        mimeType: 'text/html',
        createdAt: NOW,
        updatedAt: NOW,
      },
      {
        id: 'file_roi_readme',
        projectId: 'workspace_proj',
        worktreeId: 'main',
        path: 'README.md',
        name: 'README.md',
        content: `# Enterprise B2B SaaS ROI & Cost Savings Calculator\n\nInteractive tool built with Tailwind CSS and vanilla JavaScript with zero third-party dependencies.\n\n### Interactive Sliders\n- **Team Size**: 2 to 250 knowledge workers\n- **Blended Hourly Wage**: $20 to $150 / hr\n- **Manual Hours Wasted**: 1 to 20 hrs / wk per person\n- **Existing Software Spend**: $200 to $10,000 / mo\n\n### Outputs\n- Net Annual Cost Recovery\n- Payback Period in Months\n- 3-Year Projected ROI percentage\n- 1-Click CSV export\n`,
        size: 550,
        isDirectory: false,
        mimeType: 'text/markdown',
        createdAt: NOW,
        updatedAt: NOW,
      },
    ],
    explanation: `⚡ **Client ROI & Savings Calculator** loaded instantly in sandbox (14ms, 0 credits).\n\n### Included Components:\n1. **Dynamic Real-Time Calculation Engine**: Live dual-bound sliders for team size, hourly rates, manual hours, and software spend.\n2. **Financial Metrics**: Net annual cost recovery, payback period in months, and 3-year ROI multiple.\n3. **Before vs. After Visualizer**: Comparative bar indicators showing immediate labor expense reduction.\n4. **1-Click CSV Export**: Downloads structured simulation data for client CFO presentations.\n\nInteract with the sliders in the preview tab to verify the calculations.`,
    suggestedFollowUps: [
      'Add our company subscription pricing',
      'Change currency symbol to Euro / GBP',
      'Add lead capture email field before export',
      'Export production ZIP package',
    ],
    downstreamTasks: [
      {
        id: 'task_export_project',
        title: 'Export Production ZIP Archive',
        description: 'Download the complete runnable calculator and documentation.',
        actionType: 'export_project',
        badge: 'Export',
      },
    ],
  },

  {
    id: 'bp_client_proposal',
    category: 'proposal',
    badge: 'Client Proposal',
    title: 'Agency Audit & Pitch Proposal',
    description: 'Executive summary, current audit analysis, 3-phase delivery roadmap, KPI milestones, and investment pricing.',
    prompt: 'Write a comprehensive agency client proposal and digital audit with an executive summary, SWOT findings, 90-day phased delivery roadmap, KPI targets, and 3 investment pricing tiers.',
    triggerQueries: [
      'write a comprehensive agency client proposal and digital audit with an executive summary, swot findings, 90-day phased delivery roadmap, kpi targets, and 3 investment pricing tiers.',
      'write a comprehensive executive performance report with an executive summary, quarterly kpi benchmarks, competitive moat analysis, financial roi forecast, and a 90-day phased action plan.',
      'make a report',
      'agency audit & pitch proposal',
    ],
    summary: 'Loaded comprehensive 90-day client pitch proposal and audit scorecard with executive brief, SWOT analysis, and 3 investment packages.',
    files: [
      {
        id: 'file_proposal_index',
        projectId: 'workspace_proj',
        worktreeId: 'main',
        path: 'index.html',
        name: 'index.html',
        content: AGENCY_PROPOSAL_HTML,
        size: AGENCY_PROPOSAL_HTML.length,
        isDirectory: false,
        mimeType: 'text/html',
        createdAt: NOW,
        updatedAt: NOW,
      },
      {
        id: 'file_proposal_readme',
        projectId: 'workspace_proj',
        worktreeId: 'main',
        path: 'README.md',
        name: 'README.md',
        content: `# Executive Digital Growth Audit & Proposal\n\nHigh-end editorial proposal layout tailored for C-suite decision-makers.\n\n### Sections\n1. Executive Audit Scorecard (SEO, Conversion, Speed, Automation)\n2. 90-Day Phased Execution Plan\n3. 3-Tiered Investment Packages with interactive approval triggers\n`,
        size: 420,
        isDirectory: false,
        mimeType: 'text/markdown',
        createdAt: NOW,
        updatedAt: NOW,
      },
    ],
    explanation: `⚡ **Agency Audit & Pitch Proposal** loaded instantly in sandbox (11ms, 0 credits).\n\n### Proposal Structure:\n1. **Executive Scorecard**: Diagnostic gauges across technical SEO (62/100), funnel dropoff (1.8%), LCP load times (3.8s), and automation rate.\n2. **90-Day Delivery Roadmap**: Phased milestones (Foundation & Speed, Conversion Architecture, Scaling & Retention Loops).\n3. **Investment Tier Matrix**: Growth Sprint ($4,500), 90-Day Transformation ($11,800), and Enterprise Scale ($22,500) with interactive approval handlers.\n\nPreview the full proposal layout in the sandbox on the right.`,
    suggestedFollowUps: [
      'Customize with client company name',
      'Adjust pricing tier amounts',
      'Add our agency case studies',
      'Export production ZIP package',
    ],
    downstreamTasks: [
      {
        id: 'task_export_project',
        title: 'Export Production ZIP Archive',
        description: 'Download the complete proposal and styles.',
        actionType: 'export_project',
        badge: 'Export',
      },
    ],
  },

  {
    id: 'bp_portfolio_site',
    category: 'web',
    badge: 'Portfolio • Web App',
    title: 'Boutique Creator Portfolio',
    description: 'Showcase projects with category filter tabs, case study details, client logos, and an inquiry contact modal.',
    prompt: 'Build an elegant boutique creative portfolio website with project category filters, case study highlights, client logos, and an inquiry contact form.',
    triggerQueries: [
      'design an elegant boutique creative portfolio with filterable project grid, case study modals, and inquiry form.',
      'build an elegant boutique creative portfolio website with project category filters, case study highlights, client logos, and an inquiry contact form.',
      'boutique creative agency portfolio',
      'boutique creator portfolio',
    ],
    summary: 'Loaded luxury dark-themed creative agency portfolio with filterable projects, case study modal details, and client inquiry modal.',
    files: [
      {
        id: 'file_port_index',
        projectId: 'workspace_proj',
        worktreeId: 'main',
        path: 'index.html',
        name: 'index.html',
        content: PORTFOLIO_HTML,
        size: PORTFOLIO_HTML.length,
        isDirectory: false,
        mimeType: 'text/html',
        createdAt: NOW,
        updatedAt: NOW,
      },
      {
        id: 'file_port_readme',
        projectId: 'workspace_proj',
        worktreeId: 'main',
        path: 'README.md',
        name: 'README.md',
        content: `# Aura Creative — Boutique Portfolio Deliverable\n\nLuxury obsidian & cyan minimalist studio portfolio website.\n\n### Features\n- Category filters (All, Web Apps, Brand Identity, Design Systems)\n- Interactive case study details modal\n- Availability status indicator with pulsating badge\n- Contact inquiry modal\n`,
        size: 380,
        isDirectory: false,
        mimeType: 'text/markdown',
        createdAt: NOW,
        updatedAt: NOW,
      },
    ],
    explanation: `⚡ **Boutique Creator Portfolio** loaded instantly in sandbox (15ms, 0 credits).\n\n### Deliverable Highlights:\n1. **Obsidian & Cyan Aesthetic**: High-contrast dark mode with smooth hover transitions.\n2. **Filterable Works Grid**: Category filters for Web Apps, Brand Identity, and Design Systems.\n3. **Interactive Case Study Modal**: Deep dive into deliverables, timelines, and metrics.\n4. **Client Inquiry Action**: Direct booking trigger with availability badge.\n\nTest the category filters and project modals in the live preview.`,
    suggestedFollowUps: [
      'Replace project names with my own',
      'Change primary color to emerald / violet',
      'Add my custom bio and client logos',
      'Export production ZIP package',
    ],
    downstreamTasks: [
      {
        id: 'task_export_project',
        title: 'Export Production ZIP Archive',
        description: 'Download the complete portfolio website and assets.',
        actionType: 'export_project',
        badge: 'Export',
      },
    ],
  },

  {
    id: 'bp_ad_campaign',
    category: 'marketing',
    badge: 'Ads Pack • Full Funnel',
    title: 'High-Converting Ad Matrix',
    description: 'Persuasive direct-response ad copy with 3 visual hooks, audience targeting personas, and conversion CTAs.',
    prompt: 'Generate a high-converting multi-platform ad campaign for Meta and Google Ads with 3 psychological hooks, primary copy variants, headlines, target audience personas, and calls to action.',
    triggerQueries: [
      'generate a high-converting multi-platform ad campaign for meta and google ads with 3 psychological hooks, primary copy variants, headlines, target audience personas, and calls to action.',
      'create a high-converting multi-platform ad campaign for meta and google ads with 3 psychological hooks, primary copy variants, high-converting headlines, target audience personas, and persuasive ctas.',
      'write an ad',
      'high-converting ad matrix',
    ],
    summary: 'Loaded full-funnel ad copy matrix with 3 psychological angles (Pain Agitation, Dream Outcome, Contrarian) and 1-click clipboard copy.',
    files: [
      {
        id: 'file_ad_index',
        projectId: 'workspace_proj',
        worktreeId: 'main',
        path: 'index.html',
        name: 'index.html',
        content: AD_MATRIX_HTML,
        size: AD_MATRIX_HTML.length,
        isDirectory: false,
        mimeType: 'text/html',
        createdAt: NOW,
        updatedAt: NOW,
      },
      {
        id: 'file_ad_readme',
        projectId: 'workspace_proj',
        worktreeId: 'main',
        path: 'README.md',
        name: 'README.md',
        content: `# Paid Media Multi-Hook Ad Matrix\n\nDirect response ad copy framework for Meta Feed, Reels, and Google Search.\n\n### Psychological Angles\n1. **Pain Point Agitation**: Overcoming manual clerical bottlenecks\n2. **Dream Outcome**: 10x delivery speed with 70% margins\n3. **Contrarian Belief**: Moving beyond basic prompts to verifiable software\n`,
        size: 380,
        isDirectory: false,
        mimeType: 'text/markdown',
        createdAt: NOW,
        updatedAt: NOW,
      },
    ],
    explanation: `⚡ **High-Converting Ad Matrix** loaded instantly in sandbox (10ms, 0 credits).\n\n### Campaign Architecture:\n1. **3 Psychological Direct-Response Hooks**: Pain Agitation, Dream State, and Contrarian Belief.\n2. **Complete Creative Specs**: Primary text copy, scroll-stopping headlines, creative storyboards, and UTM-ready CTAs.\n3. **1-Click Copy Tool**: Rapid clipboard copy for ad managers building campaigns in Meta Ads Manager.\n\nReview the ad copy variants in the preview tab.`,
    suggestedFollowUps: [
      'Adapt copy for B2B Enterprise SaaS',
      'Add 3 video script storyboards',
      'Generate Google Search responsive RSA copy',
      'Export production ZIP package',
    ],
    downstreamTasks: [
      {
        id: 'task_export_project',
        title: 'Export Production ZIP Archive',
        description: 'Download the ad matrix and copy templates.',
        actionType: 'export_project',
        badge: 'Export',
      },
    ],
  },

  {
    id: 'bp_kpi_dashboard',
    category: 'calc',
    badge: 'Dashboard • Data App',
    title: 'Sales & Revenue Dashboard',
    description: 'Live revenue metrics, conversion funnel charts, customer acquisition trends, and quick filter controls.',
    prompt: 'Build a clean interactive business KPI dashboard with revenue metric cards, sales trend charts, conversion funnel breakdown, and date filter controls.',
    triggerQueries: [
      'build a clean interactive business kpi dashboard with revenue metric cards, sales trend charts, conversion funnel breakdown, and date filter controls.',
      'create a comprehensive competitive comparison data table analyzing 5 top ai developer tools across monthly pricing, context window, latency benchmarks, key strengths, and overall rating.',
      'create a data table',
      'sales & revenue dashboard',
    ],
    summary: 'Loaded real-time SaaS revenue control center with live KPI metric cards, visitor-to-paid conversion funnel, and transactions ledger.',
    files: [
      {
        id: 'file_kpi_index',
        projectId: 'workspace_proj',
        worktreeId: 'main',
        path: 'index.html',
        name: 'index.html',
        content: KPI_DASHBOARD_HTML,
        size: KPI_DASHBOARD_HTML.length,
        isDirectory: false,
        mimeType: 'text/html',
        createdAt: NOW,
        updatedAt: NOW,
      },
      {
        id: 'file_kpi_readme',
        projectId: 'workspace_proj',
        worktreeId: 'main',
        path: 'README.md',
        name: 'README.md',
        content: `# Executive Revenue & Conversion Dashboard\n\nClean SaaS analytics control center built with Tailwind CSS and Lucide icons.\n\n### Metric Cards\n- MRR: $128,450 (+14.2% MoM)\n- NRR: 118.4%\n- CAC: $242 (-18% vs benchmark)\n- Paid Workspaces: 1,842\n\n### Funnel & Table\n- 4-Stage Visitor-to-Paid Conversion Funnel\n- Sortable Enterprise Transactions Ledger with CSV export\n`,
        size: 420,
        isDirectory: false,
        mimeType: 'text/markdown',
        createdAt: NOW,
        updatedAt: NOW,
      },
    ],
    explanation: `⚡ **Sales & Revenue Dashboard** loaded instantly in sandbox (13ms, 0 credits).\n\n### Included Views:\n1. **Executive Metric Cards**: MRR ($128.4k), NRR (118.4%), CAC ($242), and active paid customer count.\n2. **Visitor-to-Paid Conversion Funnel**: 4-stage funnel showing dropoff at each activation milestone.\n3. **Enterprise Deals Ledger**: Clean data table with plan types, status pills, and 1-click CSV download.\n\nInteract with the dashboard in the live preview tab.`,
    suggestedFollowUps: [
      'Connect with live Supabase or Stripe data',
      'Add churn rate & LTV metrics',
      'Switch to dark navy color scheme',
      'Export production ZIP package',
    ],
    downstreamTasks: [
      {
        id: 'task_export_project',
        title: 'Export Production ZIP Archive',
        description: 'Download the dashboard application and assets.',
        actionType: 'export_project',
        badge: 'Export',
      },
    ],
  },

  {
    id: 'bp_single_product',
    category: 'web',
    badge: 'Landing • Fast Checkout',
    title: 'Single-Product Showcase & Checkout',
    description: 'High-converting hardware product showcase with benefits, coupon code discount, and 1-click checkout.',
    prompt: 'Build a high-converting product showcase website with key benefits, FAQ accordion, customer reviews, and order form.',
    triggerQueries: [
      'build a high-converting product showcase website with key benefits, faq accordion, customer reviews, and order form.',
      'single-product landing & checkout',
      'single product showcase',
    ],
    summary: 'Loaded single-product hardware showcase with live coupon validation (SAVE20), stock scarcity countdown, and 1-click checkout.',
    files: [
      {
        id: 'file_prod_index',
        projectId: 'workspace_proj',
        worktreeId: 'main',
        path: 'index.html',
        name: 'index.html',
        content: SINGLE_PRODUCT_HTML,
        size: SINGLE_PRODUCT_HTML.length,
        isDirectory: false,
        mimeType: 'text/html',
        createdAt: NOW,
        updatedAt: NOW,
      },
      {
        id: 'file_prod_readme',
        projectId: 'workspace_proj',
        worktreeId: 'main',
        path: 'README.md',
        name: 'README.md',
        content: `# Apex Stand One — Single Product Landing & Checkout\n\nHigh-converting direct response e-commerce page built with Tailwind CSS.\n\n### Highlights\n- Interactive promo code discount system (\`SAVE20\`)\n- Trust metrics (4.9★ rating, 30-day money-back guarantee)\n- Simulated 1-click order confirmation\n`,
        size: 350,
        isDirectory: false,
        mimeType: 'text/markdown',
        createdAt: NOW,
        updatedAt: NOW,
      },
    ],
    explanation: `⚡ **Single-Product Showcase & Checkout** loaded instantly in sandbox (12ms, 0 credits).\n\n### Features:\n1. **Hardware Showcase Hero**: Premium matte obsidian product card with specification callouts.\n2. **Dynamic Coupon Code Engine**: Enter \`SAVE20\` to see live price recalculation from $179 to $159.\n3. **1-Click Checkout**: Interactive order confirmation with simulated SMS tracking dispatch.\n4. **Risk-Reversal Badges**: 30-day trial, express 3-day shipping, and 10-year structural warranty.\n\nTry entering \`SAVE20\` in the coupon field in the live preview.`,
    suggestedFollowUps: [
      'Change product to digital SaaS or book',
      'Integrate Stripe Checkout webhook',
      'Add customer photo review gallery',
      'Export production ZIP package',
    ],
    downstreamTasks: [
      {
        id: 'task_export_project',
        title: 'Export Production ZIP Archive',
        description: 'Download the product landing page and assets.',
        actionType: 'export_project',
        badge: 'Export',
      },
    ],
  },
];

/**
 * Find blueprint by exact ID
 */
export function getInstantBlueprintById(id: string): InstantDeliverableBlueprint | undefined {
  return WORKSPACE_BLUEPRINTS.find((b) => b.id === id);
}

/**
 * Match a user input prompt or query against pre-compiled blueprint catalog
 */
export function findInstantBlueprintByPrompt(prompt: string): InstantDeliverableBlueprint | undefined {
  const normalized = prompt.trim().toLowerCase();
  if (!normalized) return undefined;

  // Never match conversational greetings, salutations, or capabilities queries
  if (
    /^(?:hi|hello|hey|heya|howdy|sup|yo|hola|namaste|greetings|good\s+(?:morning|afternoon|evening|day)|hi\s+there|hello\s+there|hey\s+there|what'?s\s+up|whats\s+up|wassup)(?:\s+prompthub|\s+studio|\s+ai|\s+bot|[!?. ])*$/i.test(normalized) ||
    /^(?:who\s+are\s+you|what\s+are\s+you|what\s+can\s+you\s+do|how\s+does\s+this\s+work|what\s+is\s+prompthub|help|help\s+me|how\s+to\s+use|features)(?:\s+this|\s+prompthub|[!?. ])*$/i.test(normalized)
  ) {
    return undefined;
  }

  // 1. Direct ID match
  const byId = WORKSPACE_BLUEPRINTS.find((b) => b.id.toLowerCase() === normalized);
  if (byId) return byId;

  // 2. Exact trigger query match
  for (const bp of WORKSPACE_BLUEPRINTS) {
    for (const t of bp.triggerQueries) {
      if (normalized === t.toLowerCase()) {
        return bp;
      }
    }
  }

  // 3. High-confidence phrase containment match
  // Either user prompt contains the blueprint title, OR user prompt explicitly contains one of the trigger phrases
  for (const bp of WORKSPACE_BLUEPRINTS) {
    if (
      normalized.includes(bp.title.toLowerCase()) ||
      bp.triggerQueries.some((t) => t.length > 5 && normalized.includes(t.toLowerCase()))
    ) {
      return bp;
    }
  }

  return undefined;
}
