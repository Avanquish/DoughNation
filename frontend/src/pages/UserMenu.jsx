import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { User, UserCircle, LogOut } from "lucide-react";

const UserMenu = () => {
  const handleProfile = () => alert("Go to profile page");
  const handleLogout = () => {
        localStorage.removeItem("token");
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
          className="min-w-[160px] bg-white border border-gray-200 rounded-lg shadow-lg p-1"
        >
          <DropdownMenu.Item
            onClick={handleProfile}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
          >
            <User className="w-4 h-4" />
            Profile
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="h-px bg-gray-200 my-1" />

          <DropdownMenu.Item
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-red-600 hover:bg-red-50 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

export default UserMenu;
