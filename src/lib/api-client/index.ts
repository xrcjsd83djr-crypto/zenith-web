import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
  export { ApiError, customFetch } from "./custom-fetch";

  async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(path, { credentials: "include", ...options });
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(text || `HTTP ${res.status}`);
    }
    if (res.status === 204) return undefined as unknown as T;
    return res.json() as Promise<T>;
  }

  export function useListStrikes(guildId: string) {
    return useQuery({ queryKey: ["strikes", guildId], queryFn: () => apiFetch<any[]>(`/api/guilds/${guildId}/strikes`), enabled: !!guildId });
  }
  export function useCreateStrike() {
    const qc = useQueryClient();
    return useMutation({ mutationFn: (data: any) => apiFetch(`/api/guilds/${data.guildId}/strikes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }), onSuccess: (_d: any, v: any) => qc.invalidateQueries({ queryKey: ["strikes", v.guildId] }) });
  }
  export function useRemoveStrike() {
    const qc = useQueryClient();
    return useMutation({ mutationFn: (data: any) => apiFetch(`/api/guilds/${data.guildId}/strikes/${data.strikeId}`, { method: "DELETE" }), onSuccess: (_d: any, v: any) => qc.invalidateQueries({ queryKey: ["strikes", v.guildId] }) });
  }

  export function useListStaff(guildId: string) {
    return useQuery({ queryKey: ["staff", guildId], queryFn: () => apiFetch<any[]>(`/api/guilds/${guildId}/staff`), enabled: !!guildId });
  }
  export function useAddStaff() {
    const qc = useQueryClient();
    return useMutation({ mutationFn: (data: any) => apiFetch(`/api/guilds/${data.guildId}/staff`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }), onSuccess: (_d: any, v: any) => qc.invalidateQueries({ queryKey: ["staff", v.guildId] }) });
  }
  export function useUpdateStaffMember() {
    const qc = useQueryClient();
    return useMutation({ mutationFn: (data: any) => apiFetch(`/api/guilds/${data.guildId}/staff/${data.userId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }), onSuccess: (_d: any, v: any) => qc.invalidateQueries({ queryKey: ["staff", v.guildId] }) });
  }
  export function useRemoveStaff() {
    const qc = useQueryClient();
    return useMutation({ mutationFn: (data: any) => apiFetch(`/api/guilds/${data.guildId}/staff/${data.userId}`, { method: "DELETE" }), onSuccess: (_d: any, v: any) => qc.invalidateQueries({ queryKey: ["staff", v.guildId] }) });
  }

  export function useListRanks(guildId: string) {
    return useQuery({ queryKey: ["ranks", guildId], queryFn: () => apiFetch<any[]>(`/api/guilds/${guildId}/ranks`), enabled: !!guildId });
  }
  export function useCreateRank() {
    const qc = useQueryClient();
    return useMutation({ mutationFn: (data: any) => apiFetch(`/api/guilds/${data.guildId}/ranks`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }), onSuccess: (_d: any, v: any) => qc.invalidateQueries({ queryKey: ["ranks", v.guildId] }) });
  }
  export function useUpdateRank() {
    const qc = useQueryClient();
    return useMutation({ mutationFn: (data: any) => apiFetch(`/api/guilds/${data.guildId}/ranks/${data.rankId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }), onSuccess: (_d: any, v: any) => qc.invalidateQueries({ queryKey: ["ranks", v.guildId] }) });
  }
  export function useDeleteRank() {
    const qc = useQueryClient();
    return useMutation({ mutationFn: (data: any) => apiFetch(`/api/guilds/${data.guildId}/ranks/${data.rankId}`, { method: "DELETE" }), onSuccess: (_d: any, v: any) => qc.invalidateQueries({ queryKey: ["ranks", v.guildId] }) });
  }

  export function useListApplications(guildId: string) {
    return useQuery({ queryKey: ["applications", guildId], queryFn: () => apiFetch<any[]>(`/api/guilds/${guildId}/applications`), enabled: !!guildId });
  }
  export function useUpdateApplication() {
    const qc = useQueryClient();
    return useMutation({ mutationFn: (data: any) => apiFetch(`/api/guilds/${data.guildId}/applications/${data.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }), onSuccess: (_d: any, v: any) => qc.invalidateQueries({ queryKey: ["applications", v.guildId] }) });
  }

  export function useListLoa(guildId: string) {
    return useQuery({ queryKey: ["loa", guildId], queryFn: () => apiFetch<any[]>(`/api/guilds/${guildId}/loa`), enabled: !!guildId });
  }
  export function useCreateLoa() {
    const qc = useQueryClient();
    return useMutation({ mutationFn: (data: any) => apiFetch(`/api/guilds/${data.guildId}/loa`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }), onSuccess: (_d: any, v: any) => qc.invalidateQueries({ queryKey: ["loa", v.guildId] }) });
  }
  export function useUpdateLoa() {
    const qc = useQueryClient();
    return useMutation({ mutationFn: (data: any) => apiFetch(`/api/guilds/${data.guildId}/loa/${data.loaId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }), onSuccess: (_d: any, v: any) => qc.invalidateQueries({ queryKey: ["loa", v.guildId] }) });
  }

  export function useGetActivityLeaderboard(guildId: string) {
    return useQuery({ queryKey: ["activity-leaderboard", guildId], queryFn: () => apiFetch<any[]>(`/api/guilds/${guildId}/activity/leaderboard`), enabled: !!guildId });
  }
  export function useListActivity(guildId: string) {
    return useQuery({ queryKey: ["activity", guildId], queryFn: () => apiFetch<any[]>(`/api/guilds/${guildId}/activity`), enabled: !!guildId });
  }

  export function useGetConfig(guildId: string) {
    return useQuery({ queryKey: ["config", guildId], queryFn: () => apiFetch<any>(`/api/guilds/${guildId}/config`), enabled: !!guildId });
  }
  export function useUpdateConfig() {
    const qc = useQueryClient();
    return useMutation({ mutationFn: (data: any) => apiFetch(`/api/guilds/${data.guildId}/config`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }), onSuccess: (_d: any, v: any) => qc.invalidateQueries({ queryKey: ["config", v.guildId] }) });
  }
  export function useGetGuildChannels(guildId: string) {
    return useQuery({ queryKey: ["channels", guildId], queryFn: () => apiFetch<any[]>(`/api/guilds/${guildId}/channels`), enabled: !!guildId });
  }
  export function useGetGuildRoles(guildId: string) {
    return useQuery({ queryKey: ["roles", guildId], queryFn: () => apiFetch<any[]>(`/api/guilds/${guildId}/roles`), enabled: !!guildId });
  }
  export function useGetApplicationQuestions(guildId: string) {
    return useQuery({ queryKey: ["app-questions", guildId], queryFn: () => apiFetch<any[]>(`/api/guilds/${guildId}/applications/questions`), enabled: !!guildId });
  }
  export function useUpdateApplicationQuestions() {
    const qc = useQueryClient();
    return useMutation({ mutationFn: (data: any) => apiFetch(`/api/guilds/${data.guildId}/applications/questions`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }), onSuccess: (_d: any, v: any) => qc.invalidateQueries({ queryKey: ["app-questions", v.guildId] }) });
  }
  