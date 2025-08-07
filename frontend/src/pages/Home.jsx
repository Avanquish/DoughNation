import React from "react";
import { Link } from "react-router-dom";

const Home = () => {
  return (
    <div className="bg-gray-50 text-gray-800 font-sans">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-amber-600">🍞 DoughNation</h1>
          <nav className="space-x-6 text-sm font-medium">
            <Link to="/" className="hover:text-amber-600">Home</Link>
            <Link to="/about" className="hover:text-amber-600">About</Link>
            <Link to="/login" className="hover:text-amber-600">Login</Link>
            <Link to="/register" className="bg-amber-500 text-white px-4 py-2 rounded hover:bg-amber-600 transition">
              Register
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-amber-50 py-20">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-4 text-amber-600">Transform Surplus into Support</h2>
          <p className="text-lg text-gray-700 mb-6">
            DoughNation connects bakeries with charities to reduce food waste and support communities in need.
          </p>
          <Link
            to="/login"
            className="bg-amber-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-amber-600 transition"
          >
            Get Started
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <h3 className="text-3xl font-bold text-center mb-10">Key Features</h3>
          <div className="grid md:grid-cols-3 gap-10 text-center">
            <div>
              <div className="text-amber-500 text-5xl mb-4">📦</div>
              <h4 className="text-xl font-semibold">Smart Inventory</h4>
              <p className="text-sm text-gray-600">Track products and get alerts when items near expiry.</p>
            </div>
            <div>
              <div className="text-amber-500 text-5xl mb-4">📡</div>
              <h4 className="text-xl font-semibold">Real-time Donations</h4>
              <p className="text-sm text-gray-600">Products are automatically posted for donation when ready.</p>
            </div>
            <div>
              <div className="text-amber-500 text-5xl mb-4">🏆</div>
              <h4 className="text-xl font-semibold">Gamified Dashboard</h4>
              <p className="text-sm text-gray-600">Earn badges and track donation performance with live stats.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-100 mt-10 py-6">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between text-sm text-gray-600">
          <p>&copy; 2025 DoughNation. All rights reserved.</p>
          <p>
            <Link to="/privacy" className="hover:underline">Privacy Policy</Link> |{" "}
            <Link to="/terms" className="hover:underline">Terms</Link>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
