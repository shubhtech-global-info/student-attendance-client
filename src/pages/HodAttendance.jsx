// src/pages/HodAttendance.jsx
import { useEffect, useMemo, useState } from "react";
import {
    getClasses,
    getAttendanceByDate,
    getMonthlyAttendanceSummary,
    getClassAttendance,
} from "../services/api";
import {
    Download,
    Calendar,
    Loader2,
    Search,
    Filter,
    Check,
    XCircle,
} from "lucide-react";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";

export default function HodAttendance() {
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState("");
    const [mode, setMode] = useState("daily"); // "daily" | "monthly" | "full"
    const [date, setDate] = useState(""); // YYYY-MM-DD
    const [month, setMonth] = useState(String(new Date().getMonth() + 1));
    const [year, setYear] = useState(String(new Date().getFullYear()));
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(false);

    // filters
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all"); // all | present | absent

    const [displayRecords, setDisplayRecords] = useState([]);

    useEffect(() => {
        fetchClasses();
    }, []);

    // If filters or date/month/year/mode change → clear displayed results
    useEffect(() => {
        if (records.length) setDisplayRecords([]);
    }, [search, statusFilter, mode, date, month, year]);

    // 🔹 Class list fetch (same as before)
    const fetchClasses = async () => {
        try {
            const list = await getClasses();
            if (!Array.isArray(list)) {
                toast.error("⚠️ Failed to load classes");
                setClasses([]);
            } else {
                setClasses(list);
                if (!list.length) toast.error("⚠️ No classes available");
            }
        } catch (err) {
            console.error("Error fetching classes", err);
            toast.error("⚠️ Failed to load classes");
        }
    };

    // 🔹 Attendance fetch (API only, no validations here)
    const fetchAttendance = async () => {
        setLoading(true);
        try {
            if (mode === "daily" && date) {
                const recs = await getAttendanceByDate(selectedClass, { date });
                const arr =
                    recs?.records ||
                    recs?.data?.records ||
                    recs?.data ||
                    (Array.isArray(recs) ? recs : []);
                setRecords(arr || []);
                if (!arr?.length) toast.error("⚠️ No daily records found");
            } else if (mode === "monthly") {
                const summaryResp = await getMonthlyAttendanceSummary(selectedClass, {
                    month,
                    year,
                });
                const summary = summaryResp?.data?.summary || summaryResp?.summary || [];
                setRecords(summary);
                if (!summary?.length) toast.error("⚠️ No monthly summary found");
            } else if (mode === "full") {
                const recs = await getClassAttendance(selectedClass);
                const arr =
                    recs?.records ||
                    recs?.data?.records ||
                    recs?.data ||
                    (Array.isArray(recs) ? recs : []);
                setRecords(arr || []);
                if (!arr?.length) toast.error("⚠️ No full records found");
            }
        } catch (err) {
            console.error("Error fetching attendance", err);
            toast.error("⚠️ Failed to fetch attendance");
        } finally {
            setLoading(false);
        }
    };

    // 🔹 Button handler with toast validations
    const handleFetchClick = () => {
        if (!selectedClass) {
            toast.error("⚠️ Please select a class first");
            return;
        }
        if (mode === "daily" && !date) {
            toast.error("⚠️ Please pick a date");
            return;
        }
        if (mode === "monthly" && (!month || !year)) {
            toast.error("⚠️ Please select both month and year");
            return;
        }
        fetchAttendance();
    };

    // 🔹 Filtering
    const filteredRecords = useMemo(() => {
        let data = [...records];
        if (search.trim()) {
            const s = search.toLowerCase();
            data = data.filter(
                (r) =>
                    (r.studentName && r.studentName.toLowerCase().includes(s)) ||
                    (r.name && r.name.toLowerCase().includes(s)) ||
                    (r.enrollmentNumber && r.enrollmentNumber.toLowerCase().includes(s))
            );
        }
        if (statusFilter !== "all" && mode !== "monthly") {
            data = data.filter((r) =>
                statusFilter === "present" ? r.isPresent : !r.isPresent
            );
        }
        return data;
    }, [records, search, statusFilter, mode]);

    // ---- NEW: Proper Excel export (.xlsx) with real Date cells ----
    const exportXLSX = () => {
        if (!filteredRecords.length) {
            toast.error("⚠️ No records to export");
            return;
        }

        let headers = [];
        let rows = [];

        // Convert dd/MM/yyyy (or timestamp) → real JS Date
        const asDate = (val) => {
            if (!val) return null;

            if (typeof val === "string" && val.includes("/")) {
                // Format: dd/MM/yyyy
                const [dd, mm, yyyy] = val.split("/");
                const d = new Date(`${yyyy}-${mm}-${dd}`);
                return isNaN(d) ? null : d;
            }

            const d = new Date(val);
            return isNaN(d) ? null : d;
        };

        const safeEnrollmentText = (val) =>
            val == null ? "" : `="${String(val)}"`; // ✅ forces Excel to keep it as text

        if (mode === "daily") {
            headers = ["Slot", "Student", "Enrollment", "Status", "Marked By"];
            rows = filteredRecords.map((r) => [
                r.slotNumber ?? "",
                r.studentName ?? "",
                safeEnrollmentText(r.enrollmentNumber),
                r.isPresent ? "Present" : "Absent",
                r.markedBy ?? "",
            ]);
        } else if (mode === "monthly") {
            headers = [
                "Enrollment",
                "Name",
                "Total Classes",
                "Presents",
                "Absents",
                "Percentage",
            ];
            rows = filteredRecords.map((r) => [
                safeEnrollmentText(r.enrollmentNumber),
                r.name ?? "",
                r.totalClasses ?? 0,
                r.presents ?? 0,
                r.absents ?? 0,
                r.percentage ?? 0,
            ]);
        } else {
            // full history
            headers = ["Date", "Slot", "Student", "Enrollment", "Status", "Marked By"];
            rows = filteredRecords.map((r) => [
                asDate(r.date || r.dateMs), // ✅ Date object
                r.slotNumber ?? "",
                r.studentName ?? "",
                safeEnrollmentText(r.enrollmentNumber),
                r.isPresent ? "Present" : "Absent",
                r.markedByName ?? r.markedBy ?? "",
            ]);
        }

        const data = [headers, ...rows];
        const ws = XLSX.utils.aoa_to_sheet(data);

        // ✅ Force Date column cells into Excel Date type
        const dateColIdx = headers.indexOf("Date");
        if (dateColIdx !== -1) {
            for (let r = 1; r <= rows.length; r++) {
                const ref = XLSX.utils.encode_cell({ r, c: dateColIdx });
                const cell = ws[ref];
                if (cell && cell.v) {
                    const d = new Date(cell.v);
                    if (!isNaN(d)) {
                        ws[ref] = { t: "d", v: d, z: "dd/mm/yyyy" };
                    }
                }
            }
        }

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Attendance");

        const fname =
            mode === "daily"
                ? `attendance_${date || "day"}.xlsx`
                : mode === "monthly"
                    ? `attendance_${month}-${year}.xlsx`
                    : `attendance_full.xlsx`;

        XLSX.writeFile(wb, fname);
    };

    // 🔹 Button handler with toast validation
    const handleExportClick = () => {
        if (!filteredRecords.length) {
            toast.error("⚠️ No records to export");
            return;
        }
        exportXLSX();
    };

    // 🔹 Selected class + display helper
    const selectedClassObj = useMemo(
        () => classes.find((c) => c._id === selectedClass),
        [classes, selectedClass]
    );

    const classDisplay = (c) => {
        const title = c.className || c.name || `${c?.semester ? "Sem " + c.semester : "Class"}`;
        const division = c.division ? ` (${c.division})` : "";
        return `${title}${division}`;
    };


    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
            <div className="max-w-7xl mx-auto bg-white shadow-lg rounded-2xl p-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <h1 className="text-2xl font-bold text-purple-700 flex items-center gap-2">
                        <Calendar size={22} className="text-purple-600" />
                        Attendance Records
                    </h1>
                    {selectedClassObj && (
                        <div className="text-sm text-gray-600">
                            Viewing: <span className="font-semibold">{classDisplay(selectedClassObj)}</span>
                            {mode === "daily" && date ? (
                                <> — {new Date(date).toLocaleDateString("en-GB")}</>
                            ) : mode === "monthly" ? (
                                <> — {month}/{year}</>
                            ) : mode === "full" ? (
                                <> — Full History</>
                            ) : null}
                        </div>
                    )}
                </div>

                {/* Controls */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <select
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        className="p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                    >
                        <option value="">-- Select Class --</option>
                        {classes.map((c) => (
                            <option key={c._id} value={c._id}>
                                {classDisplay(c)}
                            </option>
                        ))}
                    </select>

                    <select
                        value={mode}
                        onChange={(e) => setMode(e.target.value)}
                        className="p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                    >
                        <option value="daily">Daily</option>
                        <option value="monthly">Monthly</option>
                        <option value="full">Full History</option>
                    </select>

                    {mode === "daily" ? (
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                        />
                    ) : mode === "monthly" ? (
                        <div className="flex gap-2">
                            <input
                                type="number"
                                min="1"
                                max="12"
                                value={month}
                                onChange={(e) => setMonth(e.target.value)}
                                className="p-2 border rounded-lg w-24 focus:outline-none focus:ring-2 focus:ring-purple-400"
                                placeholder="MM"
                            />
                            <input
                                type="number"
                                value={year}
                                onChange={(e) => setYear(e.target.value)}
                                className="p-2 border rounded-lg w-28 focus:outline-none focus:ring-2 focus:ring-purple-400"
                                placeholder="YYYY"
                            />
                        </div>
                    ) : null}

                    <div className="flex gap-2">
                        <button
                            onClick={handleFetchClick}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 active:scale-[0.99]"
                        >
                            Fetch
                        </button>
                        <button
                            onClick={handleExportClick}
                            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 active:scale-[0.99]"
                        >
                            <Download size={18} /> Export CSV
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="mt-4 flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by name or enrollment..."
                            className="w-full pl-9 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                        />
                    </div>
                    {mode !== "monthly" && (
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="flex items-center gap-2 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                        >
                            <option value="all">All Status</option>
                            <option value="present">Present ✅</option>
                            <option value="absent">Absent ❌</option>
                        </select>
                    )}
                </div>

                {/* Results */}
                <div className="mt-6">
                    {loading ? (
                        <div className="flex items-center gap-2 text-gray-600">
                            <Loader2 className="animate-spin" size={18} />
                            Loading...
                        </div>
                    ) : !filteredRecords.length ? (
                        <p className="text-gray-500">No records found</p>
                    ) : (
                        <>
                            {/* Mobile Cards */}
                            <div className="grid sm:hidden gap-4">
                                {mode === "daily"
                                    ? filteredRecords.map((r) => (
                                        <div key={r.id} className="bg-white border rounded-xl p-4 shadow-sm">
                                            <Row label="Slot" value={r.slotNumber ?? ""} />
                                            <Row label="Student" value={r.studentName ?? ""} />
                                            <Row label="Enrollment" value={r.enrollmentNumber ?? ""} />
                                            <Row
                                                label="Status"
                                                value={r.isPresent ? "Present ✅" : "Absent ❌"}
                                                valueClass={r.isPresent ? "text-green-600" : "text-red-600"}
                                            />
                                            <Row label="Marked By" value={r.markedBy ?? ""} />
                                        </div>
                                    ))
                                    : mode === "monthly"
                                        ? filteredRecords.map((r, idx) => (
                                            <div key={idx} className="bg-white border rounded-xl p-4 shadow-sm">
                                                <Row label="Name" value={r.name ?? ""} />
                                                <Row label="Enrollment" value={r.enrollmentNumber ?? ""} />
                                                <Row label="Total Classes" value={r.totalClasses ?? 0} />
                                                <Row label="Presents" value={r.presents ?? 0} />
                                                <Row label="Absents" value={r.absents ?? 0} />
                                                <Row label="Percentage" value={`${r.percentage ?? 0}%`} />
                                            </div>
                                        ))
                                        : filteredRecords.map((r, idx) => (
                                            <div key={idx} className="bg-white border rounded-xl p-4 shadow-sm">
                                                <Row
                                                    label="Date"
                                                    value={r.date ? new Date(r.date).toLocaleDateString("en-GB") : ""}
                                                />
                                                <Row label="Slot" value={r.slotNumber ?? ""} />
                                                <Row label="Student" value={r.studentName ?? ""} />
                                                <Row label="Enrollment" value={r.enrollmentNumber ?? ""} />
                                                <Row
                                                    label="Status"
                                                    value={r.isPresent ? "Present ✅" : "Absent ❌"}
                                                    valueClass={r.isPresent ? "text-green-600" : "text-red-600"}
                                                />
                                                <Row label="Marked By" value={r.markedBy ?? ""} />
                                            </div>
                                        ))}
                            </div>

                            {/* Desktop Table */}
                            <div className="hidden sm:block overflow-x-auto">
                                {mode === "daily" ? (
                                    <TableDaily records={filteredRecords} />
                                ) : mode === "monthly" ? (
                                    <TableMonthly records={filteredRecords} />
                                ) : (
                                    <TableFull records={filteredRecords} />
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ---------- helpers ---------- */

function Th({ children }) {
    return (
        <th className="px-3 py-2 text-left text-sm font-semibold border border-gray-200">
            {children}
        </th>
    );
}

function Td({ children, className = "" }) {
    return <td className={`px-3 py-2 text-sm border border-gray-200 ${className}`}>{children}</td>;
}

function Row({ label, value, valueClass = "" }) {
    return (
        <div className="flex justify-between gap-3 py-1">
            <span className="text-gray-500">{label}</span>
            <span className={`font-medium ${valueClass}`}>{value}</span>
        </div>
    );
}

/* ---------- Tables ---------- */

function TableDaily({ records }) {
    return (
        <table className="min-w-full border rounded-lg overflow-hidden">
            <thead className="bg-purple-100 text-purple-800">
                <tr>
                    <Th>Slot</Th>
                    <Th>Student</Th>
                    <Th>Enrollment</Th>
                    <Th>Status</Th>
                    <Th>Marked By</Th>
                </tr>
            </thead>
            <tbody>
                {records.map((r) => (
                    <tr key={r.id} className="text-center border-b hover:bg-gray-50">
                        <Td>{r.slotNumber ?? ""}</Td>
                        <Td>{r.studentName ?? ""}</Td>
                        <Td>{r.enrollmentNumber ?? ""}</Td>
                        <Td className={r.isPresent ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                            {r.isPresent ? "Present" : "Absent"}
                        </Td>
                        <Td>{r.markedBy ?? ""}</Td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function TableMonthly({ records }) {
    return (
        <table className="min-w-full border rounded-lg overflow-hidden">
            <thead className="bg-purple-100 text-purple-800">
                <tr>
                    <Th>Enrollment</Th>
                    <Th>Name</Th>
                    <Th>Total Classes</Th>
                    <Th>Presents</Th>
                    <Th>Absents</Th>
                    <Th>Percentage</Th>
                </tr>
            </thead>
            <tbody>
                {records.map((r, idx) => (
                    <tr key={idx} className="text-center border-b hover:bg-gray-50">
                        <Td>{r.enrollmentNumber ?? ""}</Td>
                        <Td>{r.name ?? ""}</Td>
                        <Td>{r.totalClasses ?? 0}</Td>
                        <Td className="text-green-700 font-medium">{r.presents ?? 0}</Td>
                        <Td className="text-red-600 font-medium">{r.absents ?? 0}</Td>
                        <Td>{`${r.percentage ?? 0}%`}</Td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function TableFull({ records }) {
    return (
        <table className="min-w-full border rounded-lg overflow-hidden">
            <thead className="bg-purple-100 text-purple-800">
                <tr>
                    <Th>Date</Th>
                    <Th>Slot</Th>
                    <Th>Student</Th>
                    <Th>Enrollment</Th>
                    <Th>Status</Th>
                    <Th>Marked By</Th>
                </tr>
            </thead>
            <tbody>
                {records.map((r, idx) => (
                    <tr key={idx} className="text-center border-b hover:bg-gray-50">
                        <Td>
                            {r.date
                                ? new Date(r.date).toLocaleDateString("en-GB")
                                : r.dateMs
                                    ? new Date(r.dateMs).toLocaleDateString("en-GB")
                                    : ""}
                        </Td>
                        <Td>{r.slotNumber ?? ""}</Td>
                        <Td>{r.studentName ?? ""}</Td>
                        <Td>{r.enrollmentNumber ?? ""}</Td>
                        <Td
                            className={
                                r.isPresent
                                    ? "text-green-600 font-semibold"
                                    : "text-red-600 font-semibold"
                            }
                        >
                            {r.isPresent ? "Present" : "Absent"}
                        </Td>
                        <Td>{r.markedByName ?? r.markedBy ?? ""}</Td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
