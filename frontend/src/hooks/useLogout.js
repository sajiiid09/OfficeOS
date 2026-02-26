/**
 * useLogout — Shared logout hook with confirmation dialog.
 * Extracted from sidebar menus to avoid duplication.
 */

import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router-dom';
import swal from 'sweetalert';
import { dLogout } from '../http';
import { setAuth } from '../store/auth-slice';

export const useLogout = () => {
  const dispatch = useDispatch();
  const history = useHistory();

  const logout = async (e) => {
    if (e) e.preventDefault();

    const confirmed = await swal({
      title: 'Are you sure?',
      text: 'Do you want to logout?',
      icon: 'warning',
      buttons: ['Cancel', 'Yes, Logout'],
      dangerMode: true,
    });

    if (!confirmed) return;

    try {
      await dLogout();
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      dispatch(setAuth(null));
      history.push('/login');
    }
  };

  return logout;
};
