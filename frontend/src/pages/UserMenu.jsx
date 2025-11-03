import React from "react";
import { useNavigate } from "react-router-dom";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { User, UserCircle, LogOut } from "lucide-react";

const UserMenu = () => {
  const navigate = useNavigate(); // ✅ Added this line

  const handleProfile = () => {
    alert("Go to profile page");
  };

  const handleLogout = () => {
    // Clear both tokens (in case user is employee or bakery owner)
    localStorage.removeItem("token");
    localStorage.removeItem("employeeToken");
    
    // Navigate back to login page
    navigate("/");
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="flex items-center mt-1 justify-center w-10 h-10 user-action-bg rounded-full bg-gray-100 hover:bg-gray-200 transition"
          aria-label="User menu"
        >
          <UserCircle className="w-6 h-6 text-gray-700" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="min-w-[160px] bg-white border border-gray-200 rounded-lg shadow-lg p-1 z-50"
        >
          <DropdownMenu.Item
            onClick={handleProfile}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100 cursor-pointer outline-none"
          >
            <User className="w-4 h-4" />
            Profile
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="h-px bg-gray-200 my-1" />

          <DropdownMenu.Item
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-red-600 hover:bg-red-50 cursor-pointer outline-none"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

export default UserMenu;