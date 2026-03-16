import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import './AccordionList.css';
import { FaPlus, FaTimes, FaCalendarAlt, FaMapMarkerAlt } from 'react-icons/fa';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import api from '../../server/api';

const MAX_SELECTIONS = 2;

// Helper function to fetch initial filters
const fetchInitialFilters = async (email) => {
  try {
    const res = await api.get(`/api/filters/${encodeURIComponent(email)}`);
    return res.data;
  } catch (err) {
    return null;
  }
};

const GenreItem = ({ genre, itemIdx, genreIdx, selectedLabels, onTabSelect }) => (
  <div className="accordion-genre-section">
    <span className="accordion-genre-title">{genre.title}</span>
    <div className="accordion-tabs">
      {(genre.tabs || []).map((tab) => {
        const label = typeof tab === 'string' ? tab : tab.label;
        const icon = typeof tab === 'string' ? null : tab.icon;
        const isSelected = selectedLabels.some(
          (sel) => sel.key === `${itemIdx}-${genreIdx}` && sel.label === label
        );
        return (
          <button
            key={label}
            className={`accordion-tab ${isSelected ? 'selected' : ''}`}
            onClick={() => onTabSelect(itemIdx, genreIdx, label)}
            type="button"
          >
            {icon && <span className="tab-icon">{icon}</span>}
            {isSelected && <FaPlus style={{ fontSize: '10px', marginRight: '4px' }} />}
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  </div>
);

const AccordionList = ({ items, setWaiting }) => {
  const [selectedLabels, setSelectedLabels] = useState([]);
  const [dateFilter, setDateFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');

  const containerRef = useRef(null);
  const queryClient = useQueryClient();
  const email = localStorage.getItem('userEmail');

  // 1. Fetch initial filters
  const { isLoading: isLoadingFilters } = useQuery({
    queryKey: ['filters', email],
    queryFn: () => fetchInitialFilters(email),
    enabled: !!email,
    staleTime: 1000 * 60 * 5,
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
    onSuccess: (res) => {
      const finalEvents = res.data;
      queryClient.setQueryData(['events', email], finalEvents);
      queryClient.invalidateQueries({ queryKey: ['events', email] });
      setWaiting(false);
    },
    onError: (error) => {
      const errorMessage = error.response?.data || 'บันทึกข้อมูลล้มเหลว';
      toast.error(
        typeof errorMessage === 'string'
          ? errorMessage
          : errorMessage?.message || 'บันทึกข้อมูลล้มเหลว'
      );
      setWaiting(false);
    },
  });

  // 3. Clear genres
  const clearMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/api/update-genres`, {
        email,
        genres: [],
        subGenres: {},
        updatedAt: new Date().toISOString(),
      });
      await api.delete(`/api/events/user/${email}`);
    },
    onSuccess: () => {
      toast.info('ล้างข้อมูลความสนใจทั้งหมดแล้ว');
      setSelectedLabels([]);
      setDateFilter('');
      setLocationFilter('');
      queryClient.invalidateQueries({ queryKey: ['events', email] });
      queryClient.invalidateQueries({ queryKey: ['filters', email] });
    },
    onError: () => toast.error('ล้างข้อมูลล้มเหลว'),
  });

  const handleSave = useCallback(() => {
    if (!email || selectedLabels.length === 0) return;

    const subGenresObj = {};
    selectedLabels.forEach((sel) => {
      const [itemIdx, genreIdx] = sel.key.split('-').map(Number);
      const item = items[itemIdx];
      if (item && item.genres && item.genres[genreIdx]) {
        const genreTitle = item.genres[genreIdx].title;
        if (!subGenresObj[genreTitle]) subGenresObj[genreTitle] = [];
        if (!subGenresObj[genreTitle].includes(sel.label)) subGenresObj[genreTitle].push(sel.label);
      }
    });

    // Add date and location to search query context if backend supports it
    // For now, we follow existing pattern but add these to the query
    const searchQueryEnhancement = `${dateFilter} ${locationFilter}`.trim();

    setWaiting(true);
    saveMutation.mutate({
      email,
      genres: Object.keys(subGenresObj),
      subGenres: subGenresObj,
      searchContext: searchQueryEnhancement, // Future proofing
      updatedAt: new Date().toISOString(),
    });
  }, [email, selectedLabels, dateFilter, locationFilter, items, saveMutation, setWaiting]);

  // "Select and See" - Trigger search on selection change
  useEffect(() => {
    if (selectedLabels.length > 0) {
      const timer = setTimeout(() => {
        handleSave();
      }, 500); // Small delay to debounce rapid clicks
      return () => clearTimeout(timer);
    }
  }, [selectedLabels, dateFilter, locationFilter, handleSave]); // re-run handleSave if any filter changes

  const handleTabSelect = (itemIdx, genreIdx, label) => {
    const key = `${itemIdx}-${genreIdx}`;
    setSelectedLabels((prev) => {
      const exists = prev.some((sel) => sel.key === key && sel.label === label);
      if (exists) return prev.filter((sel) => !(sel.key === key && sel.label === label));
      if (prev.length >= MAX_SELECTIONS) {
        toast.warn(`เลือกได้สูงสุด ${MAX_SELECTIONS} รายการ`);
        return prev;
      }
      return [...prev, { key, label }];
    });
  };

  const handleRemoveLabel = (key, label) =>
    setSelectedLabels((prev) => prev.filter((sel) => !(sel.key === key && sel.label === label)));

  const handleClear = () => clearMutation.mutate();

  const isLoading = saveMutation.isPending || clearMutation.isPending || isLoadingFilters;

  return (
    <div className="accordion-list" ref={containerRef}>
      <ToastContainer position="bottom-right" autoClose={3000} hideProgressBar={false} />

      <div className="search-filters-top">
        <div className="filter-input-group">
          <label>
            <FaCalendarAlt /> เมื่อไหร่?
          </label>
          <input
            type="text"
            className="filter-input"
            placeholder="เช่น สุดสัปดาห์นี้, พรุ่งนี้"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>
        <div className="filter-input-group">
          <label>
            <FaMapMarkerAlt /> ที่ไหน?
          </label>
          <input
            type="text"
            className="filter-input"
            placeholder="เช่น สยาม, เซ็นทรัลเวิลด์"
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
          />
        </div>
      </div>

      <div className="accordion-content">
        <span className="accordion-title" style={{ marginBottom: '1.5rem', display: 'block' }}>
          เลือกสิ่งที่คุณสนใจ (สูงสุด {MAX_SELECTIONS})
        </span>

        {selectedLabels.length > 0 && (
          <div className="accordion-selected-chips-container">
            {selectedLabels.map((sel) => (
              <span className="accordion-filter-chip" key={sel.key + sel.label}>
                {sel.label}
                <span
                  className="accordion-filter-remove"
                  onClick={() => handleRemoveLabel(sel.key, sel.label)}
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
              item.genres.map((genre, genreIdx) => (
                <GenreItem
                  key={`${itemIdx}-${genreIdx}`}
                  genre={genre}
                  itemIdx={itemIdx}
                  genreIdx={genreIdx}
                  selectedLabels={selectedLabels}
                  onTabSelect={handleTabSelect}
                />
              ))}
          </div>
        ))}

        <div className="submit-genres">
          <button className="clear-genres-button" onClick={handleClear} disabled={isLoading}>
            ล้างทั้งหมด
          </button>
          <button className="submit-genres-button" onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'กำลังค้นหา...' : 'ค้นหากิจกรรม'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccordionList;
