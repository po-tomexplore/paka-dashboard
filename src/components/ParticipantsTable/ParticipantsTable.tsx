
import type { Participant } from '../../types'
import { getBirthDate, getPostalCode, calculateAge, formatDate } from '../../utils/helpers'
import './ParticipantsTable.css'
import { useState, useMemo } from 'react'

interface ParticipantsTableProps {
  participants: Participant[]
  loading: boolean
  hasFilters: boolean
  tarifNames: Record<string, string>
}


type SortKey = 'first_name' | 'last_name' | 'email' | 'age' | 'birth' | 'postal' | 'barcode' | 'create_date' | 'paid' | 'tarif';
type SortOrder = 'asc' | 'desc';

const getSortValue = (participant: Participant, key: SortKey, tarifNames?: Record<string, string>): string | number | boolean | null => {
  switch (key) {
    case 'first_name':
      return participant.owner?.first_name?.toLowerCase() || '';
    case 'last_name':
      return participant.owner?.last_name?.toLowerCase() || '';
    case 'email':
      return participant.owner?.email?.toLowerCase() || '';
    case 'age': {
      const birth = getBirthDate(participant);
      return calculateAge(birth);
    }
    case 'birth':
      return getBirthDate(participant) || '';
    case 'postal':
      return getPostalCode(participant) || '';
    case 'barcode':
      return participant.barcode;
    case 'create_date':
      return participant.create_date;
    case 'paid':
      return participant.paid;
    case 'tarif':
      return (tarifNames?.[participant.id_ticket] || participant.id_ticket || '').toLowerCase();
    default:
      return '';
  }
};

export const ParticipantsTable = ({ participants, loading, hasFilters, tarifNames }: ParticipantsTableProps) => {
  const [sortKey, setSortKey] = useState<SortKey>('last_name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const sortedParticipants = useMemo(() => {
    const sorted = [...participants];
    sorted.sort((a, b) => {
      let aValue = getSortValue(a, sortKey, tarifNames);
      let bValue = getSortValue(b, sortKey, tarifNames);

      // Pour l'âge, nulls en bas
      if (sortKey === 'age') {
        if (aValue === null) return 1;
        if (bValue === null) return -1;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }
      if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
        return sortOrder === 'asc'
          ? Number(aValue) - Number(bValue)
          : Number(bValue) - Number(aValue);
      }
      return 0;
    });
    return sorted;
  }, [participants, sortKey, sortOrder, tarifNames]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(order => (order === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return null;
    return sortOrder === 'asc' ? ' ▲' : ' ▼';
  };

  if (loading && participants.length === 0) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Chargement des participants...</p>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="participants-table">
        <thead>
          <tr>
            <th>#</th>
            <th className="sortable" onClick={() => handleSort('first_name')}>Prénom{sortIcon('first_name')}</th>
            <th className="sortable" onClick={() => handleSort('last_name')}>Nom{sortIcon('last_name')}</th>
            <th className="sortable" onClick={() => handleSort('email')}>Email{sortIcon('email')}</th>
            <th className="sortable" onClick={() => handleSort('birth')}>Date naissance{sortIcon('birth')}</th>
            <th className="sortable" onClick={() => handleSort('age')}>Âge{sortIcon('age')}</th>
            <th className="sortable" onClick={() => handleSort('postal')}>Code postal{sortIcon('postal')}</th>
            <th className="sortable" onClick={() => handleSort('barcode')}>Code-barre{sortIcon('barcode')}</th>
            <th className="sortable" onClick={() => handleSort('tarif')}>Tarif{sortIcon('tarif')}</th>
            <th className="sortable" onClick={() => handleSort('create_date')}>Inscription{sortIcon('create_date')}</th>
            <th className="sortable" onClick={() => handleSort('paid')}>Payé{sortIcon('paid')}</th>
          </tr>
        </thead>
        <tbody>
          {sortedParticipants.length === 0 ? (
            <tr>
              <td colSpan={11} className="no-data">
                {hasFilters ? 'Aucun résultat trouvé' : 'Aucun participant'}
              </td>
            </tr>
          ) : (
            sortedParticipants.map((participant, index) => {
              const birthDate = getBirthDate(participant);
              const age = calculateAge(birthDate);
              const postalCode = getPostalCode(participant);

              return (
                <tr key={participant.id_participant}>
                  <td>{index + 1}</td>
                  <td>{participant.owner?.first_name || '-'}</td>
                  <td>{participant.owner?.last_name || '-'}</td>
                  <td>{participant.owner?.email || '-'}</td>
                  <td>{birthDate || '-'}</td>
                  <td>
                    {age !== null ? (
                      <span className={`age-badge ${age < 18 ? 'age-minor' : 'age-adult'}`}>
                        {age} ans
                      </span>
                    ) : '-'}
                  </td>
                  <td>
                    {postalCode ? (
                      <span className="postal-badge">{postalCode}</span>
                    ) : '-'}
                  </td>
                  <td className="barcode">{participant.barcode}</td>
                  <td><span className="tarif-badge">{tarifNames[participant.id_ticket] || `#${participant.id_ticket}`}</span></td>
                  <td>{formatDate(participant.create_date)}</td>
                  <td>
                    <span className={`status-badge ${participant.paid ? 'status-paid' : 'status-unpaid'}`}>
                      {participant.paid ? '✓' : '✗'}
                    </span>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
