import React, { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { Crown, Medal, TrendingUp, Users, PackageCheck, Building2, HeartHandshake } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DataTable from "./DatatableSample";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

const data = [
    { id: 1, name: "Alice Johnson", email: "alice@example.com", role: "Admin" },
    { id: 2, name: "Bob Smith", email: "bob@example.com", role: "Editor" },
    { id: 3, name: "Charlie Brown", email: "charlie@example.com", role: "Viewer" },
]

const columns = [
    { accessorKey: "id", header: "ID", isHide: "true" },
    { accessorKey: "name", header: "Name", isHide: "false" },
    { accessorKey: "email", header: "Email", isHide: "false" },
    { accessorKey: "role", header: "Role", isHide: "false" },
]


const Bakery = () => {
    const [activeTab, setActiveTab] = useState("bakeries");

    return (
        <div className="space-y-6">
            <div className="p-2 pt-4 sm:p-4 md:p-6">
                <div>
                    <h2 className="text-3xl font-extrabold text-[#6b4b2b]">Bakeries</h2>
                    <p className="mt-1 text-sm text-[#7b5836]">List of Bakeries</p>
                </div>
                <div className="overflow-x-auto">
                    <DataTable columns={columns} data={data} />
                </div>
            </div>
        </div>
    );
};

export default Bakery;