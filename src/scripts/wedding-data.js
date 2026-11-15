window.WEDDING_DATA = Object.freeze({
  groom: '{{groom_name}}', bride: '{{bride_name}}',
  date: '{{groom_date}}', brideDate: '{{bride_date}}',
  ceremonyTime: '{{groom_start}}', receptionTime: '{{groom_reception}}', brideTime: '{{bride_start}}',
  venue: '{{groom_address}}', brideVenue: '{{bride_address}}',
  pickup: {
    groom: { number: '01', address: '{{pickup_one}}', zalo: '{{groom_zalo_url}}' },
    bride: { number: '02', address: '{{pickup_two}}', zalo: '{{bride_zalo_url}}' },
  },
  schedule: [['07:15', 'boarding'], ['07:45', 'departure'], ['11:00', 'reception'], ['14:30', 'return'], ['17:30', 'arrival']],
});