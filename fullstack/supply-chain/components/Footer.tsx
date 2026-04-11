import Link from 'next/link'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="w-full bg-gray-900 text-gray-300 mt-20">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid gap-12 md:grid-cols-5 mb-12">
          {/* Company Info */}
          <div>
            <Link href="/" className="flex items-center gap-2 mb-4 hover:opacity-90 transition">
              <img src="/logo_processed.png" alt="SupplyChain Logo" className="h-9 w-9 object-contain rounded-md bg-white p-0.5" />
              <span className="text-xl font-bold text-white tracking-tight poppins-bold">SupplyChain</span>
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed poppins-regular">
              Optimize your logistics with intelligent route planning and real-time tracking.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-semibold text-white mb-4 poppins-semibold">Product</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/routes" className="hover:text-green-400 transition">
                  Route Planning
                </Link>
              </li>
              <li>
                <Link href="/weather" className="hover:text-green-400 transition">
                  Weather Tracking
                </Link>
              </li>
              <li>
                <Link href="/zones" className="hover:text-green-400 transition">
                  Zone Management
                </Link>
              </li>
              <li>
                <a href="#" className="hover:text-green-400 transition">
                  Analytics
                </a>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold text-white mb-4">Company</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="#" className="hover:text-green-400 transition">
                  About Us
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-green-400 transition">
                  Careers
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-green-400 transition">
                  Blog
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-green-400 transition">
                  Press
                </a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold text-white mb-4">Resources</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="#" className="hover:text-green-400 transition">
                  Documentation
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-green-400 transition">
                  API Reference
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-green-400 transition">
                  Community
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-green-400 transition">
                  Support
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold text-white mb-4">Legal</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="#" className="hover:text-green-400 transition">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-green-400 transition">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-green-400 transition">
                  Cookie Policy
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-green-400 transition">
                  Contact
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-700 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-400">
            <p>© {currentYear} SupplyChain. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-green-400 transition">
                Twitter
              </a>
              <a href="#" className="hover:text-green-400 transition">
                LinkedIn
              </a>
              <a href="#" className="hover:text-green-400 transition">
                GitHub
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
