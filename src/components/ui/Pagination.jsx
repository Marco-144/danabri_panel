import { ChevronLeft, ChevronRight } from "lucide-react";
import Button from "@/components/ui/Button";

export default function Pagination({ currentPage, totalPages, onPageChange, itemsPerPage, totalItems }) {
    if (totalPages <= 1) return null;

    const items = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
        items.push(
            <button
                key={1}
                onClick={() => onPageChange(1)}
                className="px-2 py-1 rounded text-sm text-primary hover:bg-background"
            >
                1
            </button>
        );
        if (startPage > 2) {
            items.push(
                <span key="dots-start" className="px-1 text-muted">
                    ...
                </span>
            );
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        items.push(
            <button
                key={i}
                onClick={() => onPageChange(i)}
                className={`px-2.5 py-1 rounded text-sm font-medium transition ${i === currentPage
                        ? "bg-primary text-white"
                        : "text-primary hover:bg-background"
                    }`}
            >
                {i}
            </button>
        );
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            items.push(
                <span key="dots-end" className="px-1 text-muted">
                    ...
                </span>
            );
        }
        items.push(
            <button
                key={totalPages}
                onClick={() => onPageChange(totalPages)}
                className="px-2 py-1 rounded text-sm text-primary hover:bg-background"
            >
                {totalPages}
            </button>
        );
    }

    return (
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
            <div className="text-xs text-muted">
                Mostrando items {(currentPage - 1) * itemsPerPage + 1} a{" "}
                {Math.min(currentPage * itemsPerPage, totalItems)} de {totalItems}
            </div>

            <div className="flex items-center gap-1">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-1 rounded hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed text-muted hover:text-primary"
                >
                    <ChevronLeft size={16} />
                </button>

                <div className="flex gap-1">{items}</div>

                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-1 rounded hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed text-muted hover:text-primary"
                >
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );
}
