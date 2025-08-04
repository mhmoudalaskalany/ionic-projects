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
  showSuccessMessage: boolean = false;
  constructor(
    private httpClient: HttpClient
  ) {}

  processScannedData = () => {
    this.showSuccessMessage = false;
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
          'https://nmbookingapi.databoat.app/api/v1/reservation/ticket/' +
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
        'https://nmbookingapi.databoat.app/api/v1/reservation/update-reservation-status-basic',
        model,
        {
          headers,
        }
      )
      .subscribe(
        (res: any) => {
          if (res.status === 200) {
            this.response = null;
            this.barcode = '';
            this.showSuccessMessage = true;
          }
        },
        (error) => {
          this.showSuccessMessage = false;
        }
      );
  };

  getTotalByProperty = (propertyName: string): number => {
    if (!this.response?.visitorCategoryDetails || !Array.isArray(this.response.visitorCategoryDetails)) {
      return 0;
    }
    
    return this.response.visitorCategoryDetails.reduce((total: number, item: any) => {
      const value = item[propertyName];
      return total + (value && !isNaN(value) ? Number(value) : 0);
    }, 0);
  };

  getVisitorCategoriesWithValues = (): Array<{displayName: string, value: number}> => {
    if (!this.response?.visitorCategoryDetails || !Array.isArray(this.response.visitorCategoryDetails)) {
      return [];
    }

    // Get all unique property names from the data
    const allProperties = new Set<string>();
    this.response.visitorCategoryDetails.forEach((item: any) => {
      Object.keys(item).forEach(key => {
        // Only include properties that have numeric values
        if (typeof item[key] === 'number' || (!isNaN(Number(item[key])) && item[key] !== null && item[key] !== '')) {
          allProperties.add(key);
        }
      });
    });

    // Convert property names to display names and get values
    return Array.from(allProperties)
      .map(property => ({
        displayName: this.formatPropertyName(property),
        value: this.getTotalByProperty(property)
      }))
      .filter(category => category.value > 0)
      .sort((a, b) => a.displayName.localeCompare(b.displayName)); // Sort alphabetically
  };

  private formatPropertyName = (propertyName: string): string => {
    // Convert camelCase/snake_case to readable format
    return propertyName
      .replace(/([A-Z])/g, ' $1') // Add space before capital letters
      .replace(/_/g, ' ') // Replace underscores with spaces
      .replace(/\b\w/g, char => char.toUpperCase()) // Capitalize first letter of each word
      .replace(/Number$/, '') // Remove 'Number' suffix if present
      .trim();
  };
}
