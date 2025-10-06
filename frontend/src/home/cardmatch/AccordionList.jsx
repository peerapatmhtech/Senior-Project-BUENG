import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import "./AccordionList.css";
import { FaChevronDown, FaPlus, FaTimes } from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api from "../../server/api";

// Helper function to fetch initial filters
const fetchInitialFilters = async (email) => {
  try {
    const res = await api.get(`/api/filters/${encodeURIComponent(email)}`);
    return res.data;
  } catch (err) {
    // It's okay if it fails, means no filters saved yet.
    console.log("Could not fetch initial filters or none exist.");
    return null; // Return null to indicate no data
  }
};

const GenreItem = ({ genre, itemIdx, genreIdx, selectedLabels, onTabSelect, onToggle, isOpen }) => (
  <div className="accordion-genre-section">
    <button className={`accordion-genre-header ${isOpen ? "open" : ""}`} onClick={onToggle} aria-expanded={isOpen}>
      <span className="accordion-genre-title">{genre.title}</span>
      <FaChevronDown className="arrow" />
    </button>
    <div className={`accordion-tabs-wrapper ${isOpen ? "open" : ""}`}>
      <div className="accordion-tabs">
        {(genre.tabs || []).map((tab) => {
          const isSelected = selectedLabels.some((sel) => sel.key === `${itemIdx}-${genreIdx}` && sel.label === tab);
          return (
            <button key={tab} className={`accordion-tab ${isSelected ? "selected" : ""}`} onClick={() => onTabSelect(itemIdx, genreIdx, tab)} type="button">
              {isSelected && <FaPlus style={{ marginRight: "8px", fontSize: "10px" }} />}
              {tab}
            </button>
          );
        })}
      </div>
    </div>
  </div>
);

const AccordionList = ({ items, setWaiting }) => {
  const [isAccordionOpen, setIsAccordionOpen] = useState(false);
  const [openGenres, setOpenGenres] = useState([]);
  const [selectedLabels, setSelectedLabels] = useState([]);
  const containerRef = useRef(null);
  const queryClient = useQueryClient();
  const email = localStorage.getItem("userEmail");

  // 1. Fetch initial filters with useQuery
  const { isLoading: isLoadingFilters } = useQuery({
    queryKey: ['filters', email],
    queryFn: () => fetchInitialFilters(email),
    enabled: !!email,
    staleTime: 1000 * 60 * 5, // 5 minutes, as filters/interests don't change often
    onSuccess: (data) => {
      if (data && data.subGenres) {
        const newSelectedLabels = [];
        items.forEach((item, itemIdx) => {
          if (item.genres && Array.isArray(item.genres)) {
            item.genres.forEach((genre, genreIdx) => {
              if (data.subGenres[genre.title]) {
                data.subGenres[genre.title].forEach((sub) => {
                  newSelectedLabels.push({ key: `${itemIdx}-${genreIdx}`, label: sub });
                });
              }
            });
          }
        });
        setSelectedLabels(newSelectedLabels);
      }
    },
  });

  // 2. Mutation for saving genres
  const saveMutation = useMutation({
    mutationFn: (variables) => api.post(`/api/update-genres`, variables),
    onSuccess: () => {
      toast.success("บันทึกความสนใจของคุณแล้ว");
      // When genres change, invalidate events to refetch them
      queryClient.invalidateQueries({ queryKey: ['events', email] });
    },
    onError: () => toast.error("บันทึกข้อมูลล้มเหลว"),
    onSettled: () => setWaiting(true),
  });

  // 3. Mutation for clearing genres
  const clearMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/api/update-genres`, { email, genres: [], subGenres: {}, updatedAt: new Date().toISOString() });
      await api.delete(`/api/events/user/${email}`);
    },
    onSuccess: () => {
      toast.info("ล้างข้อมูลความสนใจทั้งหมดแล้ว");
      setSelectedLabels([]);
      // Also refetch events after clearing
      queryClient.invalidateQueries({ queryKey: ['events', email] });
      queryClient.invalidateQueries({ queryKey: ['filters', email] });
    },
    onError: () => toast.error("ล้างข้อมูลล้มเหลว"),
  });

  const handleToggleAccordion = () => setIsAccordionOpen((prev) => !prev);
  const handleToggleGenre = (genreKey) => setOpenGenres((prev) => (prev.includes(genreKey) ? prev.filter((k) => k !== genreKey) : [...prev, genreKey]));

  const handleTabSelect = (itemIdx, genreIdx, label) => {
    const key = `${itemIdx}-${genreIdx}`;
    setSelectedLabels((prev) => {
      const exists = prev.some((sel) => sel.key === key && sel.label === label);
      if (exists) return prev.filter((sel) => !(sel.key === key && sel.label === label));
      return [...prev, { key, label }];
    });
  };

  const handleRemoveLabel = (key, label) => setSelectedLabels((prev) => prev.filter((sel) => !(sel.key === key && sel.label === label)));

  const handleSave = () => {
    if (!email) return toast.error("ไม่พบอีเมลผู้ใช้ กรุณาเข้าสู่ระบบใหม่");
    if (selectedLabels.length === 0) return toast.warn("กรุณาเลือกความสนใจอย่างน้อย 1 อย่าง");

    const subGenresObj = {};
    selectedLabels.forEach((sel) => {
      const [itemIdx, genreIdx] = sel.key.split("-").map(Number);
      const item = items[itemIdx];
      if (item && item.genres && item.genres[genreIdx]) {
        const genreTitle = item.genres[genreIdx].title;
        if (!subGenresObj[genreTitle]) subGenresObj[genreTitle] = [];
        if (!subGenresObj[genreTitle].includes(sel.label)) subGenresObj[genreTitle].push(sel.label);
      }
    });

    setWaiting(true);
    // console.log("Saving genres:", genres, subGenresObj, email,);
    saveMutation.mutate({ email, genres: Object.keys(subGenresObj), subGenres: subGenresObj, updatedAt: new Date().toISOString() });
  };

  const handleClear = () => clearMutation.mutate();

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsAccordionOpen(false);
      }
    }
    if (isAccordionOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isAccordionOpen]);

  const isLoading = saveMutation.isPending || clearMutation.isPending || isLoadingFilters;

  return (
    <div className="accordion-list" ref={containerRef}>
      <ToastContainer position="bottom-right" autoClose={3000} hideProgressBar={false} />
      {isLoading && (
        <div className="accordion-loading-overlay">
          <div className="accordion-spinner">
            <div className="spinner-dot"></div><div className="spinner-dot"></div><div className="spinner-dot"></div><div className="spinner-dot"></div>
          </div>
          <div className="accordion-loading-text">กำลังบันทึก...</div>
        </div>
      )}

      <div className="accordion-item">
        <button className={`accordion-header ${isAccordionOpen ? "open" : ""}`} onClick={handleToggleAccordion} aria-expanded={isAccordionOpen}>
          <div className="accordion-header-content">
            <span className="accordion-title">เลือกความสนใจของคุณ</span>
            {selectedLabels.length > 0 && <span className="accordion-selection-count">{selectedLabels.length} รายการที่เลือก</span>}
          </div>
          <FaChevronDown className="arrow" />
        </button>

        <div className={`accordion-content ${isAccordionOpen ? "open" : ""}`}>
          {selectedLabels.length > 0 && (
            <div className="accordion-selected-chips-container">
              {selectedLabels.map((sel) => (
                <span className="accordion-filter-chip" key={sel.key + sel.label}>
                  {sel.label}
                  <span className="accordion-filter-remove" role="button" tabIndex={0} onClick={() => handleRemoveLabel(sel.key, sel.label)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { handleRemoveLabel(sel.key, sel.label); } }} aria-label={`ลบ ${sel.label}`}>
                    <FaTimes />
                  </span>
                </span>
              ))}
            </div>
          )}

          {items.map((item, itemIdx) => (
            <div key={itemIdx}>
              {item.genres && item.genres.map((genre, genreIdx) => {
                const genreKey = `${itemIdx}-${genreIdx}`;
                return <GenreItem key={genreKey} genre={genre} itemIdx={itemIdx} genreIdx={genreIdx} selectedLabels={selectedLabels} onTabSelect={handleTabSelect} onToggle={() => handleToggleGenre(genreKey)} isOpen={openGenres.includes(genreKey)} />;
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="submit-genres">
        <button className="clear-genres-button" onClick={handleClear} disabled={isLoading}>ล้างทั้งหมด</button>
        <button className="submit-genres-button" onClick={handleSave} disabled={isLoading}>{isLoading ? "กำลังบันทึก..." : "ค้นหากิจกรรม"}</button>
      </div>
    </div>
  );
};

export default AccordionList;
