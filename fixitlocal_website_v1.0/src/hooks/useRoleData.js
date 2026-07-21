import { useOutletContext } from 'react-router-dom';

export function useRoleData() {
  return useOutletContext();
}
