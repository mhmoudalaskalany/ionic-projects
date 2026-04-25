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
    private alertController: AlertController,
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
        spinner: 'circles',
      });
      await loading.present();

      this.httpClient
        .get(
          'https://bookingapi.nm.gov.om/api/v1/reservation/ticket/' +
            this.ticketNumber,
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
              this.showErrorAlert(
                error.error?.message || 'Invalid ticket number or request',
              );
            } else {
              const errMsg = error.message || (error.error?.message) || JSON.stringify(error);
              console.error('Full error object:', JSON.stringify(error));
              this.showErrorAlert(
                'Failed to load ticket information. Please try again. ' + errMsg,
              );
            }
          },
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
      spinner: 'circles',
    });
    await loading.present();

    const model = {
      reservationId: this.response.id,
      statusId: 1,
    };
    const headers = new HttpHeaders().set(
      'Authorization',
      this.basicAuthHeader,
    );
    this.httpClient
      .put(
        'https://bookingapi.nm.gov.om/api/v1/reservation/update-reservation-status-basic',
        model,
        {
          headers,
        },
      )
      .subscribe(
        (res: any) => {
          if (res.statusCode === 200) {
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
            this.showErrorAlert(
              error.error?.message ||
                'Invalid request or ticket cannot be activated',
            );
          } else {
            const errMsg = error.message || (error.error?.message) || JSON.stringify(error);
            console.error('Full error object:', JSON.stringify(error));
            this.showErrorAlert('Failed to activate ticket. Please try again. ' + errMsg);
          }
        },
      );
  };

  getTotalByProperty = (propertyName: string): number => {
    if (
      !this.response?.visitorCategoryDetails ||
      !Array.isArray(this.response.visitorCategoryDetails)
    ) {
      return 0;
    }

    return this.response.visitorCategoryDetails.reduce(
      (total: number, item: any) => {
        const value = item[propertyName];
        return total + (value && !isNaN(value) ? Number(value) : 0);
      },
      0,
    );
  };

  getVisitorCategoriesWithValues = (): Array<{
    displayName: string;
    value: number;
  }> => {
    if (
      !this.response?.visitorCategoryDetails ||
      !Array.isArray(this.response.visitorCategoryDetails)
    ) {
      return [];
    }

    const result: Array<{ displayName: string; value: number }> = [];

    const paidCategories = this.response.visitorCategoryDetails.filter(
      (c: any) => c.categoryCode !== 'Free',
    );
    const freeCategory = this.response.visitorCategoryDetails.find(
      (c: any) => c.categoryCode === 'Free',
    );

    // Show adult count per paid category (Omani, GCC, Resident, Tourist)
    for (const cat of paidCategories) {
      if (cat.adultsNumber > 0) {
        result.push({
          displayName: `${cat.categoryNameEn} Adults`,
          value: cat.adultsNumber,
        });
      }
    }

    // Show each selected free sub-category with an explicit human-readable label
    if (freeCategory) {
      const freeFields: Array<{ field: string; label: string }> = [
        { field: 'childrenNumber', label: 'Children' },
        { field: 'studentsNumber', label: 'Students' },
        { field: 'seniorCitizenNumber', label: 'Senior Citizen' },
        { field: 'seniorResidentNumber', label: 'Senior Resident' },
        { field: 'seniorGCCNationalsNumber', label: 'Senior GCC Nationals' },
        { field: 'retiredNumber', label: 'Retired' },
        { field: 'socialSecurityNumber', label: 'Social Security' },
        { field: 'specialNeedsPeopleNumber', label: 'Special Needs People' },
        {
          field: 'omaniMuseumsEmployeesNumber',
          label: 'Omani Museums Employees',
        },
        { field: 'icomOrICOMOSMemberNumber', label: 'Icom Or ICOMOS Member' },
        {
          field: 'supervisorForSchoolTripsNumber',
          label: 'Supervisor For School Trips',
        },
        { field: 'guestsOfTheDiwanNumber', label: 'Guests Of The Diwan' },
        {
          field: 'receptionStaffInLicensedHotelsNumber',
          label: 'Reception Staff In Licensed Hotels',
        },
        {
          field: 'sultanatesGuestsAndExcellenciesNumber',
          label: 'Sultanates Guests And Excellencies',
        },
        { field: 'museumFriendsNumber', label: 'Museum Friends' },
        { field: 'licensedTourGuideNumber', label: 'Licensed Tour Guide' },
        {
          field: 'journalistDigitalMediaNumber',
          label: 'Journalist Digital Media',
        },
        {
          field: 'escortsOfOfficialVisitsNumber',
          label: 'Escorts Of Official Visits',
        },
      ];

      for (const { field, label } of freeFields) {
        const value = freeCategory[field];
        if (value > 0) {
          result.push({ displayName: label, value });
        }
      }
    }

    return result;
  };

  private async showErrorAlert(message: string) {
    const alert = await this.alertController.create({
      header: 'Error',
      message: message,
      buttons: ['OK'],
    });
    await alert.present();
  }
}
