"use client";
import React, { useEffect, useRef, useState } from "react";

export default function DropdownWithIcon() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

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
                    d="M12 3.5C7.30558 3.5 3.5 7.30558 3.5 12C3.5 14.1526 4.3002 16.1184 5.61936 17.616C6.17279 15.3096 8.24852 13.5955 10.7246 13.5955H13.2746C15.7509 13.5955 17.8268 15.31 18.38 17.6167C19.6996 16.119 20.5 14.153 20.5 12C20.5 7.30558 16.6944 3.5 12 3.5Z"
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
                  />
                </svg>
                Settings
              </a>
            </li>

            {/* Support */}
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
                    d="M3.5 12C3.5 7.30558 7.30558 3.5 12 3.5C16.6944 3.5 20.5 7.30558 20.5 12C20.5 16.6944 16.6944 20.5 12 20.5C7.30558 20.5 3.5 16.6944 3.5 12Z"
                  />
                </svg>
                Support
              </a>
            </li>

            {/* Divider */}
            <li>
              <span className="my-1.5 block h-px w-full bg-gray-200 dark:bg-[#353C49]" />
            </li>

            {/* Sign out */}
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
                    d="M15.101 19.247C14.6867 19.247 14.351 18.9112 14.351 18.497L14.351 14.245H12.851V18.497C12.851 19.7396 13.8583 20.747 15.101 20.747H18.501C19.7436 20.747 20.751 19.7396 20.751 18.497L20.751 5.49609C20.751 4.25345 19.7436 3.24609 18.5009 3.24609H15.101C13.8583 3.24609 12.851 4.25345 12.851 5.49609V9.74501L14.351 9.74501V5.49609C14.351 5.08188 14.6867 4.74609 15.101 4.74609L18.5009 4.74609C18.9152 4.74609 19.251 5.08188 19.251 5.49609L19.251 18.497C19.251 18.9112 18.9152 19.247 18.501 19.247H15.101Z"
                  />
                </svg>
                Sign out
              </a>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
