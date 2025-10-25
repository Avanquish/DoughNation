"use client";
import React, { useState, useEffect, useRef } from "react";

export default function DropdownWithIconAndDivider() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    // Add event listener for clicks outside the dropdown
    document.addEventListener("mousedown", handleClickOutside);

    // Clean up the event listener on component unmount
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium text-white rounded-lg bg-brand-500 hover:bg-brand-600"
      >
        Account Menu
        <svg
          className="duration-200 ease-in-out stroke-current"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4.79199 7.396L10.0003 12.6043L15.2087 7.396"
            stroke=""
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-40 mt-2 w-full min-w-[260px] rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-[#1E2635]">
          <ul className="flex flex-col gap-1">
            {/* Edit profile */}
            <li>
              <a
                href="#"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5"
              >
                <svg
                  className="fill-current"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 3.5C7.30558 3.5 3.5 7.30558 3.5 12C3.5 14.1526 4.3002 16.1184 5.61936 17.616C6.17279 15.3096 8.24852 13.5955 10.7246 13.5955H13.2746C15.7509 13.5955 17.8268 15.31 18.38 17.6167C19.6996 16.119 20.5 14.153 20.5 12C20.5 7.30558 16.6944 3.5 12 3.5ZM17.0246 18.8566V18.8455C17.0246 16.7744 15.3457 15.0955 13.2746 15.0955H10.7246C8.65354 15.0955 6.97461 16.7744 6.97461 18.8455V18.856C8.38223 19.8895 10.1198 20.5 12 20.5C13.8798 20.5 15.6171 19.8898 17.0246 18.8566ZM2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12ZM11.9991 7.25C10.8847 7.25 9.98126 8.15342 9.98126 9.26784C9.98126 10.3823 10.8847 11.2857 11.9991 11.2857C13.1135 11.2857 14.0169 10.3823 14.0169 9.26784C14.0169 8.15342 13.1135 7.25 11.9991 7.25ZM8.48126 9.26784C8.48126 7.32499 10.0563 5.75 11.9991 5.75C13.9419 5.75 15.5169 7.32499 15.5169 9.26784C15.5169 11.2107 13.9419 12.7857 11.9991 12.7857C10.0563 12.7857 8.48126 11.2107 8.48126 9.26784Z"
                    fill=""
                  />
                </svg>
                Edit profile
              </a>
            </li>

            {/* Settings */}
            <li>
              <a
                href="#"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5"
              >
                <svg
                  className="fill-current"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M10.4861 3.5L13.5184 3.5C13.9235 3.5 14.2521 3.82851 14.2521 4.23377C14.2521 5.9529 16.1131 7.02795 17.6022 6.1682C17.953 5.96567 18.4016 6.08586 18.6042 6.43667L20.1205 9.0631C20.3232 9.41407 20.2029 9.86286 19.8519 10.0655C18.3628 10.9253 18.3627 13.0747 19.8519 13.9345C20.2029 14.1372 20.3231 14.5859 20.1205 14.9369L18.6041 17.5634C18.4016 17.9142 17.953 18.0344 17.6022 17.8318C16.1131 16.9721 14.2521 18.0471 14.2521 19.7663C14.2521 20.1715 13.9235 20.5 13.5184 20.5H10.486C10.0807 20.5 9.75206 20.1714 9.75206 19.766C9.75206 18.0461 7.89007 16.9717 6.40091 17.8314C6.0497 18.0342 5.60061 17.9139 5.39792 17.5628L3.88191 14.937C3.67927 14.586 3.79953 14.1372 4.15051 13.9346C5.63973 13.0748 5.6397 10.9253 4.1505 10.0655C3.79951 9.86282 3.67925 9.41401 3.88189 9.06303L5.39788 6.43725C5.60058 6.08617 6.04967 5.96581 6.40089 6.16858C7.89007 7.02836 9.75206 5.9539 9.75206 4.23399C9.75206 3.82862 10.0807 3.5 10.4861 3.5Z"
                    fill=""
                  />
                </svg>
                Settings
              </a>
            </li>

            {/* Divider */}
            <li>
              <span className="my-1.5 block h-px w-full bg-gray-200 dark:bg-[#353C49]"></span>
            </li>

            {/* Add more menu items below as in your TypeScript version */}
          </ul>
        </div>
      )}
    </div>
  );
}
