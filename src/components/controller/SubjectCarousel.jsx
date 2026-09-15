import React from "react";

export default function SubjectCarousel({ subjects, selectedSubjectId }) {
  const selectedIndex = subjects.findIndex((subject) => subject.id === selectedSubjectId);
  const centerIndex = Math.floor(subjects.length / 2);
  const orderedSubjects = selectedIndex >= 0 ? rotateToCenter(subjects, selectedIndex, centerIndex) : subjects;

  return (
    <div className="controller-subject-carousel" aria-label="Competition subjects">
      <div className="controller-subject-track">
        {orderedSubjects.map((subject, index) => {
          const offset = index - centerIndex;
          const selected = subject.id === selectedSubjectId;
          const distance = Math.min(Math.abs(offset), 3);
          return (
            <div
              key={subject.id}
              className={`controller-subject-item ${selected ? "is-selected" : ""}`}
              style={{
                "--subject-offset": offset,
                transform: `scale(${selected ? 1.12 : Math.max(0.82, 1 - distance * 0.05)})`,
              }}
            >
              <span>{subject.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function compactName(name) {
  const words = name.trim().split(/\s+/);
  return words.length > 1 ? `${words[0][0]}/${words.slice(1).join(" ").toLowerCase()}` : name;
}

function rotateToCenter(subjects, selectedIndex, centerIndex) {
  const start = (selectedIndex - centerIndex + subjects.length) % subjects.length;
  return [...subjects.slice(start), ...subjects.slice(0, start)];
}
