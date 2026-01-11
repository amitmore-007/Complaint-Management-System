import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  ClipboardList,
  FileText,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import toast from "react-hot-toast";
import { useLocation } from "react-router-dom";

import { makeRowId } from "../../../../utils/helpers";
import {
  useAssignedComplaints,
  useResolvedComplaints,
} from "../../../../hooks/useComplaints";
import { useCreateBillingRecord } from "../../../../hooks/useBilling";

const emptyMaterialRow = () => ({
  rowId: makeRowId(),
  name: "",
  quantity: "",
  price: "",
  billFile: null,
  billPhotoField: null,
});

const buildBillingComplaints = (assigned, resolved) => {
  const active = Array.isArray(assigned) ? assigned : [];
  const done = Array.isArray(resolved) ? resolved : [];

  const byId = new Map();
  for (const complaint of [...active, ...done]) {
    if (complaint?._id) byId.set(complaint._id, complaint);
  }

  return Array.from(byId.values()).filter(
    (c) =>
      c.status === "assigned" ||
      c.status === "in-progress" ||
      c.status === "resolved"
  );
};

const SubmitBillingTab = ({ isDarkMode, submittedQuery }) => {
  const location = useLocation();

  const [openComplaintId, setOpenComplaintId] = useState(null);
  const [formByComplaintId, setFormByComplaintId] = useState({});

  const assignmentsQuery = useAssignedComplaints();
  const resolvedQuery = useResolvedComplaints();
  const createBillingMutation = useCreateBillingRecord();

  const requestedComplaintId = useMemo(() => {
    const stateId =
      location?.state?.complaintId || location?.state?.openComplaintId;
    const searchId = new URLSearchParams(location.search).get("complaintId");
    return stateId || searchId;
  }, [location.search, location.state]);

  const billingComplaints = useMemo(
    () => buildBillingComplaints(assignmentsQuery.data, resolvedQuery.data),
    [assignmentsQuery.data, resolvedQuery.data]
  );

  const submittedRecords = submittedQuery.data?.records ?? [];
  const submittedComplaintIds = useMemo(() => {
    return new Set(
      submittedRecords
        .map((r) => r?.complaint?._id ?? r?.complaint)
        .filter(Boolean)
        .map(String)
    );
  }, [submittedRecords]);

  const complaintsToSubmit = useMemo(() => {
    return billingComplaints.filter(
      (c) => !submittedComplaintIds.has(String(c._id))
    );
  }, [billingComplaints, submittedComplaintIds]);

  const isLoadingComplaints =
    assignmentsQuery.isLoading || resolvedQuery.isLoading;
  const isLoading = isLoadingComplaints || submittedQuery.isLoading;

  const ensureForm = (complaintId) => {
    setFormByComplaintId((prev) => {
      if (prev[complaintId]) return prev;
      return {
        ...prev,
        [complaintId]: {
          isComplaintResolved: false,
          materialsUsed: false,
          materials: [emptyMaterialRow()],
        },
      };
    });
  };

  const lastAutoOpenedIdRef = useRef(null);
  useEffect(() => {
    if (!requestedComplaintId) return;
    const id = String(requestedComplaintId);
    if (lastAutoOpenedIdRef.current === id) return;

    const hasLoaded = !isLoading;
    if (!hasLoaded) return;

    const inSubmitTab = complaintsToSubmit.some((c) => String(c?._id) === id);
    if (!inSubmitTab) {
      lastAutoOpenedIdRef.current = id;
      return;
    }

    ensureForm(id);
    setOpenComplaintId(id);
    lastAutoOpenedIdRef.current = id;
  }, [requestedComplaintId, complaintsToSubmit, isLoading]);

  const updateForm = (complaintId, patch) => {
    setFormByComplaintId((prev) => ({
      ...prev,
      [complaintId]: { ...prev[complaintId], ...patch },
    }));
  };

  const updateMaterial = (complaintId, rowId, patch) => {
    setFormByComplaintId((prev) => {
      const current = prev[complaintId];
      if (!current) return prev;
      return {
        ...prev,
        [complaintId]: {
          ...current,
          materials: (current.materials ?? []).map((m) =>
            m.rowId === rowId ? { ...m, ...patch } : m
          ),
        },
      };
    });
  };

  const addMaterialRow = (complaintId) => {
    ensureForm(complaintId);
    setFormByComplaintId((prev) => {
      const current = prev[complaintId];
      const nextMaterials = [...(current?.materials ?? []), emptyMaterialRow()];
      return {
        ...prev,
        [complaintId]: { ...current, materials: nextMaterials },
      };
    });
  };

  const removeMaterialRow = (complaintId, rowId) => {
    setFormByComplaintId((prev) => {
      const current = prev[complaintId];
      if (!current) return prev;
      const nextMaterials = (current.materials ?? []).filter(
        (m) => m.rowId !== rowId
      );
      return {
        ...prev,
        [complaintId]: {
          ...current,
          materials: nextMaterials.length
            ? nextMaterials
            : [emptyMaterialRow()],
        },
      };
    });
  };

  const submitBilling = async (complaint) => {
    const complaintId = complaint?._id;
    if (!complaintId) return;

    ensureForm(complaintId);
    const form = formByComplaintId[complaintId];
    const safeForm = form || {
      isComplaintResolved: false,
      materialsUsed: false,
      materials: [],
    };

    if (createBillingMutation.isPending) return;

    const materialsUsed = !!safeForm.materialsUsed;

    const materials = (safeForm.materials ?? [])
      .map((m) => {
        const name = String(m.name || "").trim();
        const quantity = m.quantity === "" ? null : Number(m.quantity);
        const price = m.price === "" ? null : Number(m.price);

        const hasFile = !!m.billFile;
        const billPhotoField = hasFile
          ? `bill_${complaintId}_${m.rowId}`
          : null;

        return {
          name,
          quantity: Number.isFinite(quantity) ? quantity : "",
          price: Number.isFinite(price) ? price : "",
          billPhotoField,
          billFile: m.billFile,
          rowId: m.rowId,
        };
      })
      .filter(
        (m) => m.name || m.quantity !== "" || m.price !== "" || m.billFile
      );

    if (materialsUsed && materials.length === 0) {
      toast.error("Please add at least one material");
      return;
    }

    if (materialsUsed) {
      const invalid = materials.find((m) => !m.name);
      if (invalid) {
        toast.error("Material name is required");
        return;
      }
    }

    const formData = new FormData();
    formData.append("complaintId", complaintId);
    formData.append(
      "isComplaintResolved",
      String(!!safeForm.isComplaintResolved)
    );
    formData.append("materialsUsed", String(!!materialsUsed));

    const materialsPayload = materials.map((m) => ({
      name: m.name,
      quantity: m.quantity === "" ? 0 : Number(m.quantity),
      price: m.price === "" ? 0 : Number(m.price),
      billPhotoField: m.billPhotoField,
    }));
    formData.append("materials", JSON.stringify(materialsPayload));

    for (const m of materials) {
      if (m.billPhotoField && m.billFile) {
        formData.append(m.billPhotoField, m.billFile);
      }
    }

    try {
      await createBillingMutation.mutateAsync(formData);
      toast.success("Billing record submitted");

      setFormByComplaintId((prev) => {
        const next = { ...prev };
        delete next[complaintId];
        return next;
      });
      setOpenComplaintId(null);

      submittedQuery.refetch();
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to submit billing record"
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (complaintsToSubmit.length === 0) {
    return (
      <div
        className={`p-8 rounded-2xl border text-center ${
          isDarkMode
            ? "bg-gray-900 border-gray-800 text-gray-300"
            : "bg-white border-gray-200 text-gray-700"
        }`}
      >
        <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-70" />
        No pending billing submissions.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {complaintsToSubmit.map((complaint) => {
        const cid = complaint._id;
        const isOpen = openComplaintId === cid;

        const form = formByComplaintId[cid];
        const resolved = !!form?.isComplaintResolved;
        const materialsUsed = !!form?.materialsUsed;

        return (
          <div
            key={cid}
            className={`rounded-2xl border shadow-sm overflow-hidden ${
              isDarkMode
                ? "bg-gray-900 border-gray-800"
                : "bg-white border-gray-200"
            }`}
          >
            <button
              onClick={() => {
                ensureForm(cid);
                setOpenComplaintId((prev) => (prev === cid ? null : cid));
              }}
              className="w-full text-left p-5 flex items-center justify-between"
              type="button"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <FileText
                    className={`${
                      isDarkMode ? "text-blue-300" : "text-blue-600"
                    }`}
                  />
                  <h3
                    className={`font-bold text-lg ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {complaint.title}
                  </h3>
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      isDarkMode
                        ? "bg-gray-800 text-gray-300"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {complaint.complaintId}
                  </span>
                </div>
                <p
                  className={`text-sm ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  <span className="font-semibold">Location:</span>{" "}
                  {complaint.location}
                </p>
                <p
                  className={`text-sm line-clamp-2 ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  {complaint.description}
                </p>
              </div>

              <ChevronDown
                className={`h-5 w-5 transition-transform ${
                  isOpen ? "rotate-180" : "rotate-0"
                } ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
              />
            </button>

            <AnimatePresence initial={false}>
              {isOpen ? (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className={`border-t ${
                    isDarkMode ? "border-gray-800" : "border-gray-200"
                  }`}
                >
                  <div className="p-5 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div
                        className={`p-4 rounded-2xl border ${
                          isDarkMode
                            ? "bg-gray-950 border-gray-800"
                            : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <p
                          className={`font-semibold mb-3 ${
                            isDarkMode ? "text-white" : "text-gray-900"
                          }`}
                        >
                          Is the complaint resolved?
                        </p>
                        <div className="flex items-center gap-3">
                          <label
                            className={`flex items-center gap-2 text-sm font-medium ${
                              isDarkMode ? "text-gray-300" : "text-gray-700"
                            }`}
                          >
                            <input
                              type="radio"
                              name={`resolved_${cid}`}
                              checked={resolved === true}
                              onChange={() =>
                                updateForm(cid, { isComplaintResolved: true })
                              }
                            />
                            Yes
                          </label>
                          <label
                            className={`flex items-center gap-2 text-sm font-medium ${
                              isDarkMode ? "text-gray-300" : "text-gray-700"
                            }`}
                          >
                            <input
                              type="radio"
                              name={`resolved_${cid}`}
                              checked={resolved === false}
                              onChange={() =>
                                updateForm(cid, { isComplaintResolved: false })
                              }
                            />
                            No
                          </label>
                        </div>
                      </div>

                      <div
                        className={`p-4 rounded-2xl border ${
                          isDarkMode
                            ? "bg-gray-950 border-gray-800"
                            : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <p
                          className={`font-semibold mb-3 ${
                            isDarkMode ? "text-white" : "text-gray-900"
                          }`}
                        >
                          Was material used?
                        </p>
                        <div className="flex items-center gap-3">
                          <label
                            className={`flex items-center gap-2 text-sm font-medium ${
                              isDarkMode ? "text-gray-300" : "text-gray-700"
                            }`}
                          >
                            <input
                              type="radio"
                              name={`materials_${cid}`}
                              checked={materialsUsed === true}
                              onChange={() =>
                                updateForm(cid, { materialsUsed: true })
                              }
                            />
                            Yes
                          </label>
                          <label
                            className={`flex items-center gap-2 text-sm font-medium ${
                              isDarkMode ? "text-gray-300" : "text-gray-700"
                            }`}
                          >
                            <input
                              type="radio"
                              name={`materials_${cid}`}
                              checked={materialsUsed === false}
                              onChange={() =>
                                updateForm(cid, { materialsUsed: false })
                              }
                            />
                            No
                          </label>
                        </div>
                      </div>
                    </div>

                    <AnimatePresence initial={false}>
                      {materialsUsed ? (
                        <motion.div
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 6 }}
                          className="space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <h4
                              className={`font-bold ${
                                isDarkMode ? "text-white" : "text-gray-900"
                              }`}
                            >
                              Materials Used
                            </h4>
                            <button
                              onClick={() => addMaterialRow(cid)}
                              className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border transition-all ${
                                isDarkMode
                                  ? "bg-gray-950 border-gray-800 text-gray-200 hover:bg-gray-900"
                                  : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                              }`}
                              type="button"
                            >
                              <Plus className="h-4 w-4" />
                              Add material
                            </button>
                          </div>

                          <div className="overflow-x-auto">
                            <div
                              className={`min-w-[820px] rounded-2xl border ${
                                isDarkMode
                                  ? "bg-gray-950 border-gray-800"
                                  : "bg-gray-50 border-gray-200"
                              }`}
                            >
                              <div
                                className={`grid grid-cols-12 gap-3 px-4 py-3 text-xs font-bold uppercase ${
                                  isDarkMode ? "text-gray-400" : "text-gray-600"
                                }`}
                              >
                                <div className="col-span-4">Name</div>
                                <div className="col-span-2">Quantity</div>
                                <div className="col-span-2">Price</div>
                                <div className="col-span-3">Upload Bill</div>
                                <div className="col-span-1" />
                              </div>

                              <div className="space-y-2 px-4 pb-4">
                                {(form?.materials ?? []).map((m) => (
                                  <div
                                    key={m.rowId}
                                    className={`grid grid-cols-12 gap-3 p-3 rounded-2xl border ${
                                      isDarkMode
                                        ? "bg-gray-900 border-gray-800"
                                        : "bg-white border-gray-200"
                                    }`}
                                  >
                                    <div className="col-span-4">
                                      <input
                                        value={m.name}
                                        onChange={(e) =>
                                          updateMaterial(cid, m.rowId, {
                                            name: e.target.value,
                                          })
                                        }
                                        placeholder="Material name"
                                        className={`w-full px-3 py-2 rounded-xl border text-sm ${
                                          isDarkMode
                                            ? "bg-gray-950 border-gray-800 text-white placeholder:text-gray-600"
                                            : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
                                        }`}
                                      />
                                    </div>

                                    <div className="col-span-2">
                                      <input
                                        type="number"
                                        value={m.quantity}
                                        onChange={(e) =>
                                          updateMaterial(cid, m.rowId, {
                                            quantity: e.target.value,
                                          })
                                        }
                                        placeholder="Qty"
                                        className={`w-full px-3 py-2 rounded-xl border text-sm ${
                                          isDarkMode
                                            ? "bg-gray-950 border-gray-800 text-white placeholder:text-gray-600"
                                            : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
                                        }`}
                                      />
                                    </div>

                                    <div className="col-span-2">
                                      <input
                                        type="number"
                                        value={m.price}
                                        onChange={(e) =>
                                          updateMaterial(cid, m.rowId, {
                                            price: e.target.value,
                                          })
                                        }
                                        placeholder="Price"
                                        className={`w-full px-3 py-2 rounded-xl border text-sm ${
                                          isDarkMode
                                            ? "bg-gray-950 border-gray-800 text-white placeholder:text-gray-600"
                                            : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
                                        }`}
                                      />
                                    </div>

                                    <div className="col-span-3">
                                      <label
                                        className={`w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold cursor-pointer transition-all ${
                                          isDarkMode
                                            ? "bg-gray-950 border-gray-800 text-gray-200 hover:bg-gray-900"
                                            : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                                        }`}
                                      >
                                        <Upload className="h-4 w-4" />
                                        {m.billFile ? "Change" : "Upload"}
                                        <input
                                          type="file"
                                          accept="image/*"
                                          className="hidden"
                                          onChange={(e) => {
                                            const file =
                                              e.target.files?.[0] ?? null;
                                            updateMaterial(cid, m.rowId, {
                                              billFile: file,
                                            });
                                          }}
                                        />
                                      </label>
                                      {m.billFile ? (
                                        <p
                                          className={`mt-1 text-xs truncate ${
                                            isDarkMode
                                              ? "text-gray-400"
                                              : "text-gray-600"
                                          }`}
                                        >
                                          {m.billFile.name}
                                        </p>
                                      ) : null}
                                    </div>

                                    <div className="col-span-1 flex items-center justify-end">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          removeMaterialRow(cid, m.rowId)
                                        }
                                        className={`p-2 rounded-xl border ${
                                          isDarkMode
                                            ? "border-gray-800 text-red-300 hover:bg-gray-800"
                                            : "border-gray-200 text-red-600 hover:bg-red-50"
                                        }`}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>

                    <div className="flex items-center justify-end">
                      <button
                        onClick={() => submitBilling(complaint)}
                        disabled={createBillingMutation.isPending}
                        className={`px-5 py-3 rounded-2xl font-bold transition-all ${
                          createBillingMutation.isPending
                            ? "opacity-60 cursor-not-allowed"
                            : "hover:shadow-lg"
                        } ${
                          isDarkMode
                            ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                            : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                        }`}
                        type="button"
                      >
                        {createBillingMutation.isPending
                          ? "Submitting..."
                          : "Submit Billing"}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};

export default SubmitBillingTab;
