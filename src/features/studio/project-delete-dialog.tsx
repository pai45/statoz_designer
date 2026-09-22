"use client";
import { useEffect, useRef } from "react";
import type { ProjectEnvelope } from "@/domain/project";
import { Button, Icon } from "@/design-system/components/ui";

export function ProjectDeleteDialog({ target, deleting, onClose, onConfirm }: {
  target: ProjectEnvelope | null;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (target && !node.open) node.showModal();
    else if (!target && node.open) node.close();
  }, [target]);
  return <dialog ref={dialog} className="modal delete-project-modal" onCancel={event => { if (deleting) event.preventDefault(); else onClose(); }}>
    <div className="modal-heading"><div><span className="section-caption">PERMANENT ACTION</span><h2>Delete this {target?.project.pitchDeck ? "pitch deck" : "project"}?</h2></div><Button variant="ghost" aria-label="Close delete project dialog" disabled={deleting} onClick={onClose}><Icon name="close"/></Button></div>
    <div className="delete-project-warning"><Icon name="trash" size={22}/><div><strong>{target?.project.name}</strong><p>The editable project file will be permanently removed. Existing exports stay available.</p></div></div>
    <p className="muted-note">If you may need this project again, cancel and archive it instead.</p>
    <div className="modal-footer"><Button variant="secondary" disabled={deleting} onClick={onClose}>Keep project</Button><Button className="button-danger" disabled={deleting} onClick={onConfirm}><Icon name="trash" size={16}/>{deleting ? "Deleting…" : "Delete permanently"}</Button></div>
  </dialog>;
}
