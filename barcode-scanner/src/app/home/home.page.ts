import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {
  barcode: string = '';
  ticketNumber: string = '';
  response: any;
  constructor(private httpClient: HttpClient) {}

  processScannedData = () => {
    console.log('barcode scanned', this.barcode);
    // Check if the scanned data contains "Data:"
    if (this.barcode.includes('Data:')) {
      console.log('entering if includes');
      // Extract the ticket number
      this.ticketNumber = this.barcode.split('Data:')[1]?.split(',')[0] || '';
      console.log('ticket number after splitting', this.ticketNumber);
      this.getReservationDetails();
    }
  };
  getReservationDetails = () => {
    this.httpClient
      .get(
        'https://nationalmuseumbookingapi.databoat.app/api/v1/reservation/ticket/' +
          this.ticketNumber
      )
      .subscribe((res: any) => {
        console.log('response', res);
        this.response = res.data;
      });
  };

  validateTicket = () => {
    this.httpClient
      .get(
        'https://nationalmuseumbookingapi.databoat.app/api/v1/reservations/getReservationByTicketNumber/' +
          this.ticketNumber
      )
      .subscribe((res: any) => {
        this.response = res;
      });
  };
}
