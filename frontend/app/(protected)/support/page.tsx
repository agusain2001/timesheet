"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Modal } from "@/components/ui/Modal";
import { toast } from "sonner";
import {
    getSupportRequests,
    createSupportRequest,
    updateSupportRequest,
    deleteSupportRequest,
    SupportRequest,
} from "@/services/support";

// Icons
const PlusIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
);

const EyeIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
);

const EditIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
);

const TrashIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const SearchIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);

const UploadIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
);

const XIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

export default function SupportPage() {
    const [requests, setRequests] = useState<SupportRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");

    // Modal states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<SupportRequest | null>(null);

    // Form states
    const [message, setMessage] = useState("");
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const data = await getSupportRequests();
            setRequests(data);
        } catch (err) {
            console.error("Failed to fetch support requests:", err);
            setRequests([]);
        } finally {
            setLoading(false);
        }
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) {
                toast.error("Image size must be less than 10MB");
                return;
            }
            if (!['image/jpeg', 'image/png', 'image/gif', 'image/jpg'].includes(file.type)) {
                toast.error("Only JPEG, PNG, JPG, GIF images are allowed");
                return;
            }
            setSelectedImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeImage = () => {
        setSelectedImage(null);
        setImagePreview(null);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;

        try {
            setCreating(true);
            // TODO: If image is selected, upload it first and get URL
            await createSupportRequest({ message });
            toast.success("Support request created successfully!");
            setShowCreateModal(false);
            setMessage("");
            setSelectedImage(null);
            setImagePreview(null);
            fetchRequests();
        } catch (err) {
            console.error("Failed to create support request:", err);
            toast.error("Failed to create support request");
        } finally {
            setCreating(false);
        }
    };

    const handleStatusUpdate = async (id: string, status: string) => {
        try {
            await updateSupportRequest(id, { status: status as "open" | "in_progress" | "resolved" | "closed" });
            toast.success("Status updated successfully!");
            fetchRequests();
            setShowEditModal(false);
        } catch (err) {
            console.error("Failed to update status:", err);
            toast.error("Failed to update status");
        }
    };

    const handleDelete = async () => {
        if (!selectedRequest) return;

        try {
            await deleteSupportRequest(selectedRequest.id);
            toast.success("Support request deleted!");
            setShowDeleteModal(false);
            setSelectedRequest(null);
            fetchRequests();
        } catch (err) {
            console.error("Failed to delete:", err);
            toast.error("Failed to delete support request");
        }
    };

    // Filter requests
    const filteredRequests = requests.filter((req) => {
        const matchesSearch = req.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            req.user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "all" || req.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // Pagination
    const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
    const paginatedRequests = filteredRequests.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const statusColors: Record<string, string> = {
        open: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
        in_progress: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        resolved: "bg-green-500/20 text-green-400 border-green-500/30",
        closed: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    const getInitials = (name?: string) => {
        if (!name) return "U";
        return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Support Management</h1>
                    <p className="text-foreground/60 mt-1">Manage and track support requests from employees</p>
                </div>

                {/* New Support Request Button */}
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                    <PlusIcon />
                    New Support Request
                </button>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative flex-1 min-w-[200px] max-w-md">
                        <SearchIcon />
                        <input
                            type="text"
                            placeholder="Search support messages..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-foreground/5 border border-foreground/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 bg-foreground/5 border border-foreground/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">All Status</option>
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                    </select>
                    {(searchQuery || statusFilter !== "all") && (
                        <button
                            onClick={() => {
                                setSearchQuery("");
                                setStatusFilter("all");
                            }}
                            className="px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg text-sm font-medium transition-colors"
                        >
                            Clear Filters
                        </button>
                    )}
                </div>

                {/* Table */}
                <div className="rounded-xl border border-foreground/10 bg-background overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center h-48">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                        </div>
                    ) : paginatedRequests.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-foreground/60">
                            <p>No support requests found</p>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="mt-3 text-blue-400 hover:text-blue-300 text-sm"
                            >
                                Create your first support request
                            </button>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-foreground/5 border-b border-foreground/10">
                                <tr>
                                    <th className="text-left px-6 py-4 text-sm font-medium text-foreground/60">Employee</th>
                                    <th className="text-left px-6 py-4 text-sm font-medium text-foreground/60">Message</th>
                                    <th className="text-left px-6 py-4 text-sm font-medium text-foreground/60">Status</th>
                                    <th className="text-left px-6 py-4 text-sm font-medium text-foreground/60">Date</th>
                                    <th className="text-left px-6 py-4 text-sm font-medium text-foreground/60">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-foreground/10">
                                {paginatedRequests.map((request) => (
                                    <tr key={request.id} className="hover:bg-foreground/5 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-sm font-medium">
                                                    {getInitials(request.user?.full_name)}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-foreground">{request.user?.full_name || "Unknown"}</p>
                                                    <p className="text-xs text-foreground/50">{request.user?.email || "-"}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-foreground/80 max-w-md truncate">{request.message}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[request.status] || statusColors.open}`}>
                                                {request.status.replace("_", " ")}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-foreground/60 text-sm">
                                            {formatDate(request.created_at)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => {
                                                        setSelectedRequest(request);
                                                        setShowViewModal(true);
                                                    }}
                                                    className="p-2 hover:bg-foreground/10 rounded-lg transition-colors text-blue-400"
                                                    title="View"
                                                >
                                                    <EyeIcon />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedRequest(request);
                                                        setShowEditModal(true);
                                                    }}
                                                    className="p-2 hover:bg-foreground/10 rounded-lg transition-colors text-amber-400"
                                                    title="Edit"
                                                >
                                                    <EditIcon />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedRequest(request);
                                                        setShowDeleteModal(true);
                                                    }}
                                                    className="p-2 hover:bg-foreground/10 rounded-lg transition-colors text-red-400"
                                                    title="Delete"
                                                >
                                                    <TrashIcon />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-6 py-4 border-t border-foreground/10">
                            <p className="text-sm text-foreground/60">
                                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredRequests.length)} of {filteredRequests.length} results
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1 bg-foreground/10 hover:bg-foreground/20 disabled:opacity-50 rounded-lg text-sm transition-colors"
                                >
                                    Previous
                                </button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${currentPage === page
                                            ? "bg-blue-600 text-white"
                                            : "bg-foreground/10 hover:bg-foreground/20"
                                            }`}
                                    >
                                        {page}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1 bg-foreground/10 hover:bg-foreground/20 disabled:opacity-50 rounded-lg text-sm transition-colors"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Modal */}
            <Modal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                title="Create Support Request"
            >
                <form onSubmit={handleCreate} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-foreground/80 mb-1">
                            Support Message <span className="text-red-400">*</span>
                        </label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="w-full px-3 py-2 bg-foreground/5 border border-foreground/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px]"
                            placeholder="Describe your support request in detail..."
                            autoFocus
                        />
                    </div>

                    {/* Image Upload */}
                    <div>
                        <label className="block text-sm font-medium text-foreground/80 mb-1">
                            Support Image (Optional)
                        </label>
                        {imagePreview ? (
                            <div className="relative inline-block">
                                <img
                                    src={imagePreview}
                                    alt="Preview"
                                    className="max-h-40 rounded-lg border border-foreground/20"
                                />
                                <button
                                    type="button"
                                    onClick={removeImage}
                                    className="absolute -top-2 -right-2 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
                                >
                                    <XIcon />
                                </button>
                            </div>
                        ) : (
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-foreground/20 rounded-lg cursor-pointer hover:bg-foreground/5 transition-colors">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <UploadIcon />
                                    <p className="mt-2 text-sm text-foreground/60">Upload Image</p>
                                </div>
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/jpeg,image/png,image/jpg,image/gif"
                                    onChange={handleImageSelect}
                                />
                            </label>
                        )}
                        <p className="text-xs text-blue-400 mt-1">
                            Supported formats: JPEG, PNG, JPG, GIF. Maximum size: 10MB
                        </p>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => {
                                setShowCreateModal(false);
                                setSelectedImage(null);
                                setImagePreview(null);
                            }}
                            className="flex-1 px-4 py-2 bg-foreground/10 hover:bg-foreground/20 rounded-lg text-sm font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={creating || !message.trim()}
                            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            {creating ? "Creating..." : "Create"}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* View Modal */}
            <Modal
                isOpen={showViewModal}
                onClose={() => setShowViewModal(false)}
                title="Support Request Details"
            >
                {selectedRequest && (
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm text-foreground/60">Employee</p>
                            <p className="font-medium">{selectedRequest.user?.full_name || "Unknown"}</p>
                        </div>
                        <div>
                            <p className="text-sm text-foreground/60">Message</p>
                            <p className="text-foreground/80 whitespace-pre-wrap">{selectedRequest.message}</p>
                        </div>
                        <div className="flex gap-6">
                            <div>
                                <p className="text-sm text-foreground/60">Status</p>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[selectedRequest.status]}`}>
                                    {selectedRequest.status.replace("_", " ")}
                                </span>
                            </div>
                            <div>
                                <p className="text-sm text-foreground/60">Created</p>
                                <p>{formatDate(selectedRequest.created_at)}</p>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Edit Status Modal */}
            <Modal
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                title="Update Status"
            >
                {selectedRequest && (
                    <div className="space-y-4">
                        <p className="text-foreground/60">Update status for this support request:</p>
                        <div className="grid grid-cols-2 gap-2">
                            {["open", "in_progress", "resolved", "closed"].map((status) => (
                                <button
                                    key={status}
                                    onClick={() => handleStatusUpdate(selectedRequest.id, status)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${selectedRequest.status === status
                                        ? statusColors[status]
                                        : "bg-foreground/5 border-foreground/20 hover:bg-foreground/10"
                                        }`}
                                >
                                    {status.replace("_", " ")}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                title="Delete Support Request"
            >
                <div className="space-y-4">
                    <p className="text-foreground/60">
                        Are you sure you want to delete this support request? This action cannot be undone.
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowDeleteModal(false)}
                            className="flex-1 px-4 py-2 bg-foreground/10 hover:bg-foreground/20 rounded-lg text-sm font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleDelete}
                            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </Modal>
        </DashboardLayout>
    );
}
