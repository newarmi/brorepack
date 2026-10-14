/**
 * Профиль FACEIT: загрузка по нику (api/faceit → useFaceitProfile), карточка и тексты ошибок.
 */

export { default as ProfileDetails } from './components/ProfileDetails.vue';
export { default as ProfileSkeleton } from './components/ProfileSkeleton.vue';
export { useFaceitProfile } from './composables/useFaceitProfile';
export {
  checkPlayerNotFound,
  getProfileErrorText,
  getProfileErrorTitle,
} from './utils/profileErrors';
