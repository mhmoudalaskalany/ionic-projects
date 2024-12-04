import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {
  username = 'Admin';
  password = 'Admin@123456';
  basicAuthHeader = 'Basic ' + btoa(`${this.username}:${this.password}`);
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

  processManualEnteredData = () => {
    console.log('barcode scanned in manual data', this.barcode);
    this.ticketNumber = this.barcode;
    this.getReservationDetails();
  };

  getReservationDetails = () => {
    if (this.ticketNumber) {
      this.httpClient
        .get(
          'https://nationalmuseumbookingapi.databoat.app/api/v1/reservation/ticket/' +
            this.ticketNumber
        )
        .subscribe((res: any) => {
          console.log('response', res);
          this.response = res.data;
        });
    }
  };

  validateTicket = (action: any) => {
    if (action == 2) {
      this.response = null;
      this.barcode = '';
      return;
    }
    const model = {
      reservationId: this.response.id,
      statusId: 1,
    };
    const headers = new HttpHeaders().set(
      'Authorization',
      this.basicAuthHeader
    );
    this.httpClient
      .put(
        'https://localhost:5001/api/v1/reservation/update-reservation-status-basic',
        model,
        {
          headers,
        }
      )
      .subscribe((res: any) => {
        console.log('res after activate', res);
      });
  };
}
