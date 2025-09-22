import React, { useState, useRef, useEffect } from "react";
import "./AccordionList.css";
import { FaChevronDown, FaPlus, FaTimes } from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";

// A single genre item component
const GenreItem = ({
  genre,
  itemIdx,
  genreIdx,
  selectedLabels,
  onTabSelect,
  onToggle,
  isOpen,
}) => {
  return (
    <div className="accordion-genre-section">
      <button
        className={`accordion-genre-header ${isOpen ? "open" : ""}`}
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <span className="accordion-genre-title">{genre.title}</span>
        <FaChevronDown className="arrow" />
      </button>
      <div className={`accordion-tabs-wrapper ${isOpen ? "open" : ""}`}>
        <div className="accordion-tabs">
          {(genre.tabs || []).map((tab) => {
            const isSelected = selectedLabels.some(
              (sel) => sel.key === `${itemIdx}-${genreIdx}` && sel.label === tab
            );
            return (
              <button
                key={tab}
                className={`accordion-tab ${isSelected ? "selected" : ""}`}
                onClick={() => onTabSelect(itemIdx, genreIdx, tab)}
                type="button"
              >
                {isSelected && (
                  <FaPlus style={{ marginRight: "8px", fontSize: "10px" }} />
                )}
                {tab}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const AccordionList = ({ items, setWaiting }) => {
  const [isAccordionOpen, setIsAccordionOpen] = useState(false); // Default to open
  const [openGenres, setOpenGenres] = useState([]); // Array of open genre indices
  const [selectedLabels, setSelectedLabels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const containerRef = useRef(null);

  // Toggle main accordion
  const handleToggleAccordion = () => {
    setIsAccordionOpen((prev) => !prev);
  };

  // Toggle genre sub-accordion
  const handleToggleGenre = (genreKey) => {
    setOpenGenres((prev) =>
      prev.includes(genreKey)
        ? prev.filter((k) => k !== genreKey)
        : [...prev, genreKey]
    );
  };

  const handleTabSelect = (itemIdx, genreIdx, label) => {
    const key = `${itemIdx}-${genreIdx}`;
    setSelectedLabels((prev) => {
      const exists = prev.some((sel) => sel.key === key && sel.label === label);
      if (exists) {
        return prev.filter((sel) => !(sel.key === key && sel.label === label));
      }
      return [...prev, { key, label }];
    });
  };

  const handleRemoveLabel = (key, label) => {
    setSelectedLabels((prev) =>
      prev.filter((sel) => !(sel.key === key && sel.label === label))
    );
  };

  const handleSave = async () => {
    setLoading(true);
    setError("");

    const subGenresObj = {};
    selectedLabels.forEach((sel) => {
      const [itemIdx, genreIdx] = sel.key.split("-").map(Number);
      const item = items[itemIdx];
      if (item && item.genres && item.genres[genreIdx]) {
        const genreTitle = item.genres[genreIdx].title;
        if (!subGenresObj[genreTitle]) {
          subGenresObj[genreTitle] = [];
        }
        if (!subGenresObj[genreTitle].includes(sel.label)) {
          subGenresObj[genreTitle].push(sel.label);
        }
      }
    });

    const selectedGenres = Object.keys(subGenresObj);
    const email = localStorage.getItem("userEmail");

    if (!email) {
      toast.error("ไม่พบอีเมลผู้ใช้ กรุณาเข้าสู่ระบบใหม่");
      setLoading(false);
      return;
    }
    if (selectedGenres.length === 0) {
      toast.warn("กรุณาเลือกความสนใจอย่างน้อย 1 อย่าง");
      setLoading(false);
      return;
    }

    try {
      setWaiting(true);
      await axios.post(
        `${import.meta.env.VITE_APP_API_BASE_URL}/api/update-genres`,
        {
          email,
          genres: selectedGenres,
          subGenres: subGenresObj,
          updatedAt: new Date().toISOString(),
        }
      );
      toast.success("บันทึกความสนใจของคุณแล้ว");
    } catch (err) {
      setWaiting(false);
      setError("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
      toast.error("บันทึกข้อมูลล้มเหลว");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    setLoading(true);
    setError("");
    const email = localStorage.getItem("userEmail");
    try {
      const genres = await axios.post(
        `${import.meta.env.VITE_APP_API_BASE_URL}/api/update-genres`,
        {
          email,
          genres: [],
          subGenres: {},
          updatedAt: new Date().toISOString(),
        }
      );
      const events = await axios.delete(
        `${import.meta.env.VITE_APP_API_BASE_URL}/api/events/user/${email}`
      );
      if (events.status == 200 && genres.status == 200) {
        toast.info("ล้างข้อมูลความสนใจทั้งหมดแล้ว");
        setSelectedLabels([]);
      }
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการล้างข้อมูล");
      toast.error("ล้างข้อมูลล้มเหลว");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchInitialFilters = async () => {
      const email = localStorage.getItem("userEmail");
      if (!email) return;
      setLoading(true);
      try {
        const res = await axios.get(
          `${
            import.meta.env.VITE_APP_API_BASE_URL
          }/api/filters/${encodeURIComponent(email)}`
        );
        const data = res.data;
        if (data && data.subGenres) {
          const newSelectedLabels = [];
          items.forEach((item, itemIdx) => {
            if (item.genres && Array.isArray(item.genres)) {
              item.genres.forEach((genre, genreIdx) => {
                if (data.subGenres[genre.title]) {
                  data.subGenres[genre.title].forEach((sub) => {
                    newSelectedLabels.push({
                      key: `${itemIdx}-${genreIdx}`,
                      label: sub,
                    });
                  });
                }
              });
            }
          });
          setSelectedLabels(newSelectedLabels);
        }
      } catch (err) {
        // It's okay if it fails, means no filters saved yet.
        console.log("Could not fetch initial filters or none exist.");
      }
      setLoading(false);
    };
    fetchInitialFilters();
  }, [items]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsAccordionOpen(false);
      }
    }

    if (isAccordionOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isAccordionOpen]);

  return (
    <div className="accordion-list" ref={containerRef}>
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
      />
      {loading && (
        <div className="accordion-loading-overlay">
          <div className="accordion-spinner">
            <div className="spinner-dot"></div>
            <div className="spinner-dot"></div>
            <div className="spinner-dot"></div>
            <div className="spinner-dot"></div>
          </div>
          <div className="accordion-loading-text">กำลังบันทึก...</div>
        </div>
      )}

      <div className="accordion-item">
        <button
          className={`accordion-header ${isAccordionOpen ? "open" : ""}`}
          onClick={handleToggleAccordion}
          aria-expanded={isAccordionOpen}
        >
          <div className="accordion-header-content">
            <span className="accordion-title">เลือกความสนใจของคุณ</span>
            {selectedLabels.length > 0 && (
              <span className="accordion-selection-count">
                {selectedLabels.length} รายการที่เลือก
              </span>
            )}
          </div>
          <FaChevronDown className="arrow" />
        </button>

        <div className={`accordion-content ${isAccordionOpen ? "open" : ""}`}>
          {selectedLabels.length > 0 && (
            <div className="accordion-selected-chips-container">
              {selectedLabels.map((sel) => (
                <span
                  className="accordion-filter-chip"
                  key={sel.key + sel.label}
                >
                  {sel.label}
                  <span
                    className="accordion-filter-remove"
                    role="button"
                    tabIndex={0}
                    onClick={() => handleRemoveLabel(sel.key, sel.label)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        handleRemoveLabel(sel.key, sel.label);
                      }
                    }}
                    aria-label={`ลบ ${sel.label}`}
                  >
                    <FaTimes />
                  </span>
                </span>
              ))}
            </div>
          )}

          {items.map((item, itemIdx) => (
            <div key={itemIdx}>
              {item.genres &&
                item.genres.map((genre, genreIdx) => {
                  const genreKey = `${itemIdx}-${genreIdx}`;
                  return (
                    <GenreItem
                      key={genreKey}
                      genre={genre}
                      itemIdx={itemIdx}
                      genreIdx={genreIdx}
                      selectedLabels={selectedLabels}
                      onTabSelect={handleTabSelect}
                      onToggle={() => handleToggleGenre(genreKey)}
                      isOpen={openGenres.includes(genreKey)}
                    />
                  );
                })}
            </div>
          ))}
        </div>
      </div>

      <div className="submit-genres">
        <button
          className="clear-genres-button"
          onClick={handleClear}
          disabled={loading}
        >
          ล้างทั้งหมด
        </button>
        <button
          className="submit-genres-button"
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? "กำลังบันทึก..." : "ค้นหากิจกรรม"}
        </button>
      </div>
      {error && <div className="error-message">{error}</div>}
    </div>
  );
};

export default AccordionList;
