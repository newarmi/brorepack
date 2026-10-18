import { shallowRef } from 'vue';

import { useTelegram } from '@/shared/telegram';
import { useToast } from '@/shared/ui';

import { formatPhone } from '../utils/phoneMask';

/** Телефон получателя из Telegram в один тап */
export const usePhoneFromTelegram = (onPhoneReceived: (phone: string) => void) => {
  const telegram = useTelegram();
  const { showToast } = useToast();

  const isPhoneRequesting = shallowRef(false);

  const requestPhone = async (): Promise<void> => {
    isPhoneRequesting.value = true;
    try {
      const phone = await telegram.requestContact();
      if (!phone) {
        showToast('Номер не получили — введи его вручную');
        return;
      }
      // Telegram отдаёт «+79001234567» — показываем в той же маске, что и при ручном вводе
      onPhoneReceived(formatPhone(phone));
    } finally {
      isPhoneRequesting.value = false;
    }
  };

  return { isPhoneRequesting, requestPhone };
};

export default usePhoneFromTelegram;
