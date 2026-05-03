"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, MessageSquareText, Pencil, Pin, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatRelativeTime } from "@/lib/utils";
import { useAppStore } from "@/lib/store";

const purposes = [
  { value: "GUIDE", label: "Guide" },
  { value: "INSTRUCTION", label: "Instruction" },
  { value: "UPDATE", label: "Update" },
  { value: "QUESTION", label: "Question" },
  { value: "GENERAL", label: "General" },
];

const audiences = [
  { value: "EVERYONE", label: "Everyone" },
  { value: "PARENTS", label: "Parents" },
  { value: "CAREGIVERS", label: "Caretakers" },
  { value: "SPECIFIC", label: "Specific person" },
];

const purposeStyles: Record<string, string> = {
  GUIDE: "bg-feed/10 text-feed",
  INSTRUCTION: "bg-wake/10 text-wake",
  UPDATE: "bg-success/10 text-success",
  QUESTION: "bg-nurse/10 text-nurse",
  GENERAL: "bg-pump/10 text-pump",
};

const audienceLabels = Object.fromEntries(audiences.map((item) => [item.value, item.label]));
const purposeLabels = Object.fromEntries(purposes.map((item) => [item.value, item.label]));
const editOptions = [
  { value: "CREATOR_ONLY", label: "Only me" },
  { value: "PARENTS", label: "Parents" },
  { value: "CAREGIVERS", label: "Caretakers" },
  { value: "EVERYONE", label: "Everyone" },
];
const editLabels = Object.fromEntries(editOptions.map((item) => [item.value, item.label]));

export default function NotesPage() {
  const selectedChildId = useAppStore((s) => s.selectedChildId);
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [purpose, setPurpose] = useState("GENERAL");
  const [audience, setAudience] = useState("EVERYONE");
  const [attentionName, setAttentionName] = useState("");
  const [editPermission, setEditPermission] = useState("CREATOR_ONLY");
  const [pinned, setPinned] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["notes", selectedChildId],
    queryFn: () => fetch(`/api/notes?childId=${selectedChildId}`).then((r) => r.json()),
    enabled: !!selectedChildId,
  });

  const notes = Array.isArray(data?.notes) ? data.notes : [];

  const resetForm = () => {
    setTitle("");
    setBody("");
    setPurpose("GENERAL");
    setAudience("EVERYONE");
    setAttentionName("");
    setEditPermission("CREATOR_ONLY");
    setPinned(false);
    setEditingNoteId(null);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(editingNoteId ? `/api/notes/${editingNoteId}` : "/api/notes", {
        method: editingNoteId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(!editingNoteId ? { childId: selectedChildId } : {}),
          title,
          body,
          purpose,
          audience,
          attentionName: attentionName || undefined,
          editPermission,
          pinned,
        }),
      });

      if (!response.ok) throw new Error("Could not save note");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      resetForm();
      setShowForm(false);
      toast.success("Note saved");
    },
    onError: () => toast.error("Could not save note"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/notes/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Could not delete note");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      toast.success("Note deleted");
    },
    onError: () => toast.error("Could not delete note"),
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    saveMutation.mutate();
  };

  const startEdit = (note: any) => {
    setEditingNoteId(note.id);
    setTitle(note.title);
    setBody(note.body);
    setPurpose(note.purpose);
    setAudience(note.audience);
    setAttentionName(note.attentionName || "");
    setEditPermission(note.editPermission || "CREATOR_ONLY");
    setPinned(!!note.pinned);
    setShowForm(true);
  };

  return (
    <div className="px-4 pt-4 pb-24">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-text-primary">Notes</h1>
          <p className="text-sm text-text-secondary mt-1">Guides, instructions, and handoff notes.</p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => {
            if (showForm) {
              resetForm();
              setShowForm(false);
            } else {
              setShowForm(true);
            }
          }}
          className="gap-2"
          disabled={!selectedChildId}
        >
          <Plus className="w-4 h-4" />
          {showForm ? "Close" : "New"}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-2xl p-4 mb-5 space-y-4">
          <Input
            label="Title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Nap routine, bottle prep, question for parents..."
            maxLength={120}
            required
          />

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Note</label>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Write the details here."
              rows={5}
              maxLength={2000}
              required
              className="w-full rounded-2xl border border-border bg-elevated px-4 py-3 text-text-primary placeholder:text-text-muted caret-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Purpose</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {purposes.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setPurpose(item.value)}
                  className={`px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                    purpose === item.value ? "bg-primary text-base" : "bg-base text-text-secondary"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">For</p>
            <div className="grid grid-cols-2 gap-2">
              {audiences.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setAudience(item.value)}
                  className={`px-3 py-2 rounded-2xl text-sm font-medium ${
                    audience === item.value ? "bg-primary text-base" : "bg-base text-text-secondary"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {audience === "SPECIFIC" && (
            <Input
              label="Person"
              value={attentionName}
              onChange={(event) => setAttentionName(event.target.value)}
              placeholder="Name or email"
              maxLength={100}
            />
          )}

          <label className="flex items-center gap-3 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={pinned}
              onChange={(event) => setPinned(event.target.checked)}
              className="h-4 w-4 rounded border-border bg-base text-primary focus:ring-primary"
            />
            Pin this note near the top
          </label>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Who can edit</p>
            <div className="grid grid-cols-2 gap-2">
              {editOptions.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setEditPermission(item.value)}
                  className={`px-3 py-2 rounded-2xl text-sm font-medium ${
                    editPermission === item.value ? "bg-primary text-base" : "bg-base text-text-secondary"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-text-muted mt-2">Delete is limited to the note creator or a parent.</p>
          </div>

          <div className="flex gap-2">
            <Button type="submit" full disabled={saveMutation.isPending || !selectedChildId}>
              {editingNoteId ? "Update Note" : "Save Note"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => { resetForm(); setShowForm(false); }}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {!selectedChildId ? (
        <div className="bg-surface rounded-2xl p-6 text-center">
          <p className="text-text-secondary">Add or select a child before leaving notes.</p>
        </div>
      ) : isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="bg-surface rounded-2xl h-28 animate-pulse" />
          ))}
        </div>
      ) : notes.length === 0 ? (
        <div className="bg-surface rounded-2xl p-6 text-center">
          <BookOpen className="w-8 h-8 mx-auto text-text-muted mb-3" />
          <p className="text-text-secondary">No notes yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note: any) => (
            <article key={note.id} className="bg-surface border border-border rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {note.pinned && <Pin className="w-4 h-4 text-primary shrink-0" />}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${purposeStyles[note.purpose] || purposeStyles.GENERAL}`}>
                      {purposeLabels[note.purpose] || "General"}
                    </span>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-base text-text-secondary">
                      {note.audience === "SPECIFIC" && note.attentionName
                        ? `For ${note.attentionName}`
                        : audienceLabels[note.audience] || "Everyone"}
                    </span>
                  </div>
                  <h2 className="font-display text-lg font-semibold text-text-primary break-words">{note.title}</h2>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {note.canEdit && (
                    <button
                      type="button"
                      onClick={() => startEdit(note)}
                      className="p-2 text-text-muted hover:text-primary transition-colors"
                      aria-label="Edit note"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                  {note.canDelete && (
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(note.id)}
                      className="p-2 text-text-muted hover:text-danger transition-colors"
                      aria-label="Delete note"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <p className="text-sm text-text-secondary whitespace-pre-wrap break-words mt-3">{note.body}</p>

              <div className="flex items-center gap-2 mt-4 text-xs text-text-muted">
                <MessageSquareText className="w-3.5 h-3.5" />
                <span>
                  Left by {note.user?.name || note.user?.email || "Someone"} ({note.authorKind}) · {formatRelativeTime(new Date(note.createdAt))}
                </span>
              </div>
              <p className="text-xs text-text-muted mt-2">
                Editable by {editLabels[note.editPermission] || "Only me"}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
