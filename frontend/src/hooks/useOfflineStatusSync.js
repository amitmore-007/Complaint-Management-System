import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { complaintService } from "../services/complaintService";
import {
  countQueuedStatusUpdates,
  flushStatusUpdateQueue,
} from "../utils/offlineQueue";
import { complaintKeys, dashboardKeys } from "./useComplaints";

/**
 * Drains the offline status-update queue whenever the browser regains
 * connectivity, and once on start-up for updates queued in a previous session.
 *
 * Mounted app-wide rather than on the technician pages: an update queued on the
 * assignments page must still sync if the technician has since navigated away.
 */
export const useOfflineStatusSync = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    let running = false;

    const sync = async () => {
      if (running || !navigator.onLine) return;
      running = true;

      try {
        if ((await countQueuedStatusUpdates()) === 0) return;

        const { synced, failed } = await flushStatusUpdateQueue(
          ({ complaintId, formData }) =>
            complaintService.assignments.updateStatus(complaintId, formData),
        );

        if (synced > 0) {
          toast.success(
            `${synced} offline update${synced > 1 ? "s" : ""} synced.`,
          );
          queryClient.invalidateQueries({ queryKey: complaintKeys.all });
          queryClient.invalidateQueries({
            queryKey: dashboardKeys.technicianAssignments(),
          });
        }

        if (failed > 0) {
          toast.error(
            `${failed} offline update${failed > 1 ? "s" : ""} could not be saved. Please redo them.`,
          );
        }
      } catch (error) {
        console.error("Offline queue sync failed:", error);
      } finally {
        running = false;
      }
    };

    sync();
    window.addEventListener("online", sync);
    return () => window.removeEventListener("online", sync);
  }, [queryClient]);
};
