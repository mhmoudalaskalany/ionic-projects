import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component } from '@angular/core';
import { LoadingController, AlertController } from '@ionic/angular';

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
  isLoadingTicket: boolean = false;
  isActivating: boolean = false;
  constructor(
    private httpClient: HttpClient,
    private loadingController: LoadingController,
    private alertController: AlertController
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

  getReservationDetails = async () => {
    if (this.ticketNumber) {
      this.isLoadingTicket = true;
      // Clear previous response data when starting a new search
      this.response = null;
      this.showSuccessMessage = false;
      
      const loading = await this.loadingController.create({
        message: 'Loading ticket information...',
        spinner: 'circles'
      });
      await loading.present();

      this.httpClient
        .get(
          'https://bookingapi.nm.gov.om/api/v1/reservation/ticket/' +
            this.ticketNumber
        )
        .subscribe(
          (res: any) => {
            console.log('response', res);
            this.response = res.data;
            this.isLoadingTicket = false;
            loading.dismiss();
          },
          (error) => {
            console.error('Error loading ticket:', error);
            this.isLoadingTicket = false;
            this.response = null; // Clear any previous ticket data
            this.showSuccessMessage = false;
            loading.dismiss();
            
            // Show error popup for 400 status or other errors
            if (error.status === 400) {
              this.showErrorAlert(error.error?.message || 'Invalid ticket number or request');
            } else {
              this.showErrorAlert('Failed to load ticket information. Please try again.');
            }
          }
        );
    }
  };

  validateTicket = async (action: any) => {
    if (action == 2) {
      this.response = null;
      this.barcode = '';
      return;
    }

    this.isActivating = true;
    const loading = await this.loadingController.create({
      message: 'Activating ticket...',
      spinner: 'circles'
    });
    await loading.present();

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
        'https://bookingapi.nm.gov.om/api/v1/reservation/update-reservation-status-basic',
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
          this.isActivating = false;
          loading.dismiss();
        },
        (error) => {
          console.error('Error activating ticket:', error);
          this.showSuccessMessage = false;
          this.isActivating = false;
          loading.dismiss();
          
          // Show error popup for 400 status or other errors
          if (error.status === 400) {
            this.showErrorAlert(error.error?.message || 'Invalid request or ticket cannot be activated');
          } else {
            this.showErrorAlert('Failed to activate ticket. Please try again.');
          }
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

  private async showErrorAlert(message: string) {
    const alert = await this.alertController.create({
      header: 'Error',
      message: message,
      buttons: ['OK']
    });
    await alert.present();
  }
}
